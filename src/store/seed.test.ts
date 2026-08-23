import { describe, expect, it } from 'vitest';
import { queryAvailability, validateSnapshot } from '@richardmcquiston01/calendar-booking-system';
import { buildSeed } from './seed';

describe('buildSeed', () => {
  it('produces a snapshot that passes engine validation', () => {
    const { snapshot } = buildSeed();
    expect(validateSnapshot(snapshot).ok).toBe(true);
  });

  it('resolves every directory id to a real row in the snapshot', () => {
    const { snapshot, directory } = buildSeed();

    expect(snapshot.entities.find((e) => e.id === directory.center.entityId)).toBeDefined();
    expect(snapshot.calendars.find((c) => c.id === directory.center.calendarId)).toBeDefined();

    expect(snapshot.entities.find((e) => e.id === directory.teachers.ada.entityId)).toBeDefined();
    expect(snapshot.calendars.find((c) => c.id === directory.teachers.ada.calendarId)).toBeDefined();
    expect(snapshot.entities.find((e) => e.id === directory.teachers.sam.entityId)).toBeDefined();
    expect(snapshot.calendars.find((c) => c.id === directory.teachers.sam.calendarId)).toBeDefined();

    expect(snapshot.entities.find((e) => e.id === directory.students.priya)).toBeDefined();
    expect(snapshot.entities.find((e) => e.id === directory.students.marcus)).toBeDefined();

    expect(snapshot.events.find((e) => e.id === directory.events.adaStaffMeeting)).toBeDefined();
    expect(snapshot.events.find((e) => e.id === directory.events.samReadingCircle)).toBeDefined();
    expect(snapshot.events.find((e) => e.id === directory.events.centerBlockingEvent)).toBeDefined();

    expect(snapshot.slots.find((s) => s.id === directory.slots.adaGroupSlot)).toBeDefined();

    expect(snapshot.bookings.find((b) => b.id === directory.bookings.priyaAdHocWithAda)).toBeDefined();
    expect(snapshot.bookings.find((b) => b.id === directory.bookings.marcusInGroupSlot)).toBeDefined();
    expect(snapshot.bookings.find((b) => b.id === directory.bookings.priyaAdHocWithSam)).toBeDefined();
  });

  it('gives Ada a non-empty open availability window across the demo week', () => {
    const { snapshot, directory } = buildSeed();
    const weekEnd = new Date(directory.weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const result = queryAvailability(snapshot, directory.teachers.ada.calendarId, {
      start: `${directory.weekStart}T00:00:00.000Z`,
      end: weekEnd.toISOString(),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.intervals.length).toBeGreaterThan(0);
    }
  });

  it('marks Ada as rolling up to the center and Sam as not', () => {
    const { directory } = buildSeed();
    expect(directory.teachers.ada.rollsUp).toBe(true);
    expect(directory.teachers.sam.rollsUp).toBe(false);
  });
});
