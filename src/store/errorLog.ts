import {
  BatchingErrorAdapter,
  CompositeErrorAdapter,
  ConsoleErrorAdapter,
  WebStorageErrorAdapter,
  WebhookErrorAdapter,
} from '@richardmcquiston01/error-log-adapter';
import type { ErrorLogAdapter, ErrorLogResult } from '@richardmcquiston01/error-log-adapter';
import { getRuntimeConfig } from './runtimeConfig';

export type DemoErrorCode =
  | 'STATE_LOAD_FAILED'
  | 'STATE_SAVE_FAILED'
  | 'ACTION_FAILED'
  | 'UNHANDLED_ERROR'
  | 'UNHANDLED_REJECTION';

const LOG_PREFIX = '[calendar-demo]';
const ERROR_LOG_STORAGE_KEY = 'calendar-demo:error-log';
const MAX_STORED_ENTRIES = 100;

/**
 * Console always; the browser's localStorage (capped) when available; and the
 * configured webhook (batched, so a slow receiver never blocks the UI) when
 * `errorLogWebhookUrl` is set at container start.
 */
export function createErrorLog(): ErrorLogAdapter<DemoErrorCode> {
  const sinks: ErrorLogAdapter<DemoErrorCode>[] = [
    new ConsoleErrorAdapter<DemoErrorCode>({ prefix: LOG_PREFIX }),
  ];

  try {
    sinks.push(
      new WebStorageErrorAdapter<DemoErrorCode>(window.localStorage, {
        key: ERROR_LOG_STORAGE_KEY,
        maxEntries: MAX_STORED_ENTRIES,
        prefix: LOG_PREFIX,
      }),
    );
  } catch (error: unknown) {
    // Accessing localStorage throws when site data is blocked; console still works.
    console.warn(`${LOG_PREFIX} localStorage error sink disabled:`, error);
  }

  const webhookUrl: string = getRuntimeConfig().errorLogWebhookUrl;
  if (webhookUrl !== '') {
    try {
      sinks.push(
        new BatchingErrorAdapter<DemoErrorCode>(
          new WebhookErrorAdapter<DemoErrorCode>(webhookUrl, { prefix: LOG_PREFIX }),
        ),
      );
    } catch (error: unknown) {
      console.warn(`${LOG_PREFIX} webhook error sink disabled:`, error);
    }
  }

  return new CompositeErrorAdapter<DemoErrorCode>(sinks);
}

/** Logs `message` and reports (never throws) whether any sink failed to take it. */
export async function logError(
  errorLog: ErrorLogAdapter<DemoErrorCode>,
  code: DemoErrorCode,
  message: string,
  cause?: unknown,
): Promise<ErrorLogResult> {
  return errorLog.log({ code, message, cause, source: 'calendar-booking-system-demo' });
}
