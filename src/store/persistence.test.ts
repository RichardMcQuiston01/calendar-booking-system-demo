import { describe, expect, it } from 'vitest';
import { memoryAdapter } from '@richardmcquiston01/storage-adapters';
import { buildSeed } from './seed';
import { createStatePersistence, isStale, parsePersistedState, STATE_STORAGE_KEY } from './persistence';
import type { PersistedCalendarState } from './store';
import { addDays } from './seed';

function buildPersisted(): PersistedCalendarState {
  const { snapshot, directory } = buildSeed();
  const blockingEvent = snapshot.events.find((event) => event.id === directory.events.centerBlockingEvent);
  if (!blockingEvent) throw new Error('seed is missing the blocking event');
  return {
    snapshot,
    directory,
    selectedCalendarId: directory.teachers.sam.calendarId,
    isBlockingEventActive: true,
    blockingEventTemplate: { ...blockingEvent },
  };
}

describe('parsePersistedState', () => {
  it('accepts a full persisted state', () => {
    const persisted = buildPersisted();
    expect(parsePersistedState(JSON.parse(JSON.stringify(persisted)))).toEqual(persisted);
  });

  it('names the missing snapshot table', () => {
    const persisted = JSON.parse(JSON.stringify(buildPersisted()));
    delete persisted.snapshot.bookings;
    expect(() => parsePersistedState(persisted)).toThrow('"bookings"');
  });

  it('rejects non-objects', () => {
    expect(() => parsePersistedState('nope')).toThrow('must be an object');
  });
});

describe('isStale', () => {
  it('is false for the current demo week and true once it has passed', () => {
    const persisted = buildPersisted();
    expect(isStale(persisted)).toBe(false);
    const nextWeek = new Date(`${addDays(persisted.directory.weekStart, 8)}T12:00:00Z`);
    expect(isStale(persisted, nextWeek)).toBe(true);
  });
});

describe('createStatePersistence', () => {
  it('round-trips state through a storage adapter', async () => {
    const persistence = createStatePersistence(memoryAdapter());
    const persisted = buildPersisted();

    const saved = await persistence.save(STATE_STORAGE_KEY, persisted);
    expect(saved.ok).toBe(true);

    const loaded = await persistence.load(STATE_STORAGE_KEY);
    expect(loaded.ok && loaded.value.value).toEqual(persisted);
  });
});
