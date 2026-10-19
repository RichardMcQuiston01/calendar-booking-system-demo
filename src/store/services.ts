import { createErrorLog, logError } from './errorLog';
import type { DemoErrorCode } from './errorLog';
import type { ErrorLogAdapter } from '@richardmcquiston01/error-log-adapter';
import { createStatePersistence, isStale, STATE_STORAGE_KEY } from './persistence';
import { getCalendarStoreState, getPersistedState, restoreState, subscribeToStore } from './store';
import type { LastAction } from './store';

/** Actions whose failure is a normal user outcome (a booking conflict) rather than an error to log. */
const EXPECTED_FAILURE_LABELS: readonly string[] = ['bookAppointment'];

function reportToErrorLog(
  errorLog: ErrorLogAdapter<DemoErrorCode>,
  code: DemoErrorCode,
  message: string,
  cause?: unknown,
): void {
  void logError(errorLog, code, message, cause).then((result) => {
    if (!result.ok) {
      console.error(`Error log sinks rejected "${code}": ${result.error ?? 'no reason given'}`);
    }
  });
}

/**
 * Wires the demo to `@richardmcquiston01/storage-adapters` (restore + autosave
 * of the calendar state) and `@richardmcquiston01/error-log-adapter` (storage
 * failures, failed actions and uncaught browser errors). Browser-only; call once
 * before the first render. Never throws: every failure is logged and the demo
 * carries on from its seed data.
 */
export async function startServices(): Promise<void> {
  const errorLog: ErrorLogAdapter<DemoErrorCode> = createErrorLog();

  window.addEventListener('error', (event: ErrorEvent) => {
    reportToErrorLog(errorLog, 'UNHANDLED_ERROR', event.message, event.error);
  });
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    reportToErrorLog(errorLog, 'UNHANDLED_REJECTION', 'Unhandled promise rejection', event.reason);
  });

  try {
    const persistence = createStatePersistence();

    const loaded = await persistence.load(STATE_STORAGE_KEY);
    if (!loaded.ok) {
      reportToErrorLog(errorLog, 'STATE_LOAD_FAILED', `Could not restore the saved demo: ${loaded.error}`);
      await persistence.remove(STATE_STORAGE_KEY);
    } else if (loaded.value.value !== null && !isStale(loaded.value.value)) {
      restoreState(loaded.value.value);
    }

    let lastSaved = getPersistedState();
    let lastReportedAction: LastAction | null = null;
    subscribeToStore(() => {
      const current = getPersistedState();
      const action: LastAction | null = getCalendarStoreState().lastAction;
      if (action && !action.ok && action !== lastReportedAction && !EXPECTED_FAILURE_LABELS.includes(action.label)) {
        reportToErrorLog(errorLog, 'ACTION_FAILED', `${action.label} failed: ${action.message ?? 'no message'}`);
      }
      lastReportedAction = action;

      const changed: boolean =
        current.snapshot !== lastSaved.snapshot ||
        current.directory !== lastSaved.directory ||
        current.selectedCalendarId !== lastSaved.selectedCalendarId ||
        current.isBlockingEventActive !== lastSaved.isBlockingEventActive;
      if (!changed) return;
      lastSaved = current;
      void persistence.save(STATE_STORAGE_KEY, current).then((saved) => {
        if (!saved.ok) {
          reportToErrorLog(errorLog, 'STATE_SAVE_FAILED', `Could not save the demo state: ${saved.error}`);
        }
      });
    });
  } catch (error: unknown) {
    reportToErrorLog(errorLog, 'STATE_LOAD_FAILED', 'Persistence setup threw unexpectedly', error);
  }
}
