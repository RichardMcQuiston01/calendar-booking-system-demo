import { createPersistence, memoryAdapter, withFallback } from '@richardmcquiston01/storage-adapters';
import type { Persistence, StorageAdapter } from '@richardmcquiston01/storage-adapters';
import { localStorageAdapter } from '@richardmcquiston01/storage-adapters/browser';
import { getDemoWeekStart } from './seed';
import type { PersistedCalendarState } from './store';

export const STATE_STORAGE_KEY = 'calendar-demo:state';

/** The snapshot is a few KB of JSON; the library default of 64 KB is too tight once bookings accumulate. */
const MAX_STATE_BYTES: number = 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Reads a stored payload back, throwing a descriptive error for anything that isn't a full demo state. */
export function parsePersistedState(raw: unknown): PersistedCalendarState {
  if (!isRecord(raw)) {
    throw new Error(`Stored demo state must be an object, received ${typeof raw}`);
  }
  const { snapshot, directory } = raw;
  if (!isRecord(snapshot)) {
    throw new Error('Stored demo state is missing its calendar snapshot');
  }
  for (const table of ['entities', 'calendars', 'entityCalendars', 'events', 'availabilityRules', 'slots', 'bookings']) {
    if (!Array.isArray(snapshot[table])) {
      throw new Error(`Stored calendar snapshot is missing the "${table}" table`);
    }
  }
  if (!isRecord(directory) || typeof directory.weekStart !== 'string') {
    throw new Error('Stored demo state is missing its directory or demo week start');
  }
  if (typeof raw.selectedCalendarId !== 'string' || typeof raw.isBlockingEventActive !== 'boolean') {
    throw new Error('Stored demo state is missing the selected calendar or blocking-event flag');
  }
  if (!isRecord(raw.blockingEventTemplate)) {
    throw new Error('Stored demo state is missing the blocking event template');
  }
  return raw as unknown as PersistedCalendarState;
}

/** A persisted demo week that has already passed would show an all-past calendar, so reseed instead. */
export function isStale(persisted: PersistedCalendarState, reference: Date = new Date()): boolean {
  return persisted.directory.weekStart < getDemoWeekStart(reference);
}

/** localStorage when the browser allows it, otherwise in-memory (state then lasts for the page only). */
export function createStateStorage(): StorageAdapter {
  return withFallback(localStorageAdapter(), memoryAdapter());
}

export function createStatePersistence(
  adapter: StorageAdapter = createStateStorage(),
): Persistence<PersistedCalendarState> {
  return createPersistence<PersistedCalendarState>(adapter, {
    parse: parsePersistedState,
    field: 'state',
    label: 'calendar demo state',
    maxBytes: MAX_STATE_BYTES,
    onConflict: 'overwrite',
  });
}
