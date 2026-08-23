import { beforeEach, describe, expect, it } from 'vitest';
import { addDays } from './seed';
import { zonedTimeToInstant } from './timezone';
import { createId } from './ids';
import {
  bookAppointment,
  cancelBooking,
  getCalendarStoreState,
  previewBooking,
  resetToSeed,
  toggleCenterBlockingEvent,
} from './store';

beforeEach(() => {
  resetToSeed();
});

describe('bookAppointment', () => {
  it('commits a non-conflicting ad-hoc booking', () => {
    const { directory } = getCalendarStoreState();
    const tuesday = addDays(directory.weekStart, 1);
    const bookingId = createId();
    const before = getCalendarStoreState().snapshot.bookings.length;

    const result = bookAppointment({
      id: bookingId,
      calendarId: directory.teachers.ada.calendarId,
      start: zonedTimeToInstant(tuesday, '13:00', directory.teachers.ada.timeZone),
      end: zonedTimeToInstant(tuesday, '13:30', directory.teachers.ada.timeZone),
      attendeeId: directory.students.priya,
    });

    expect(result.ok).toBe(true);
    const state = getCalendarStoreState();
    expect(state.snapshot.bookings).toHaveLength(before + 1);
    expect(state.snapshot.bookings.some((b) => b.id === bookingId)).toBe(true);
    expect(state.lastAction).toEqual({ label: 'bookAppointment', ok: true });
    expect(state.bookingDraft).toBeNull();
  });

  it('rejects a booking that conflicts with the recurring Staff Meeting, unless overridden', () => {
    const { directory } = getCalendarStoreState();
    const wednesday = addDays(directory.weekStart, 2);
    const conflictingInput = {
      id: createId(),
      calendarId: directory.teachers.ada.calendarId,
      start: zonedTimeToInstant(wednesday, '12:00', directory.teachers.ada.timeZone),
      end: zonedTimeToInstant(wednesday, '12:15', directory.teachers.ada.timeZone),
      attendeeId: directory.students.marcus,
    };

    const preview = previewBooking(conflictingInput);
    expect(preview.ok).toBe(true);
    if (preview.ok) {
      expect(preview.value.conflicts.length).toBeGreaterThan(0);
    }

    const rejected = bookAppointment(conflictingInput);
    expect(rejected.ok).toBe(false);
    expect(getCalendarStoreState().lastAction?.ok).toBe(false);

    const before = getCalendarStoreState().snapshot.bookings.length;
    const overridden = bookAppointment(conflictingInput, true);
    expect(overridden.ok).toBe(true);
    expect(getCalendarStoreState().snapshot.bookings).toHaveLength(before + 1);
  });
});

describe('cancelBooking', () => {
  it('removes an existing booking from the snapshot', () => {
    const { directory } = getCalendarStoreState();
    const seededBookingId = directory.bookings.priyaAdHocWithAda;
    const before = getCalendarStoreState().snapshot.bookings.length;

    cancelBooking(seededBookingId);

    const state = getCalendarStoreState();
    expect(state.snapshot.bookings).toHaveLength(before - 1);
    expect(state.snapshot.bookings.some((b) => b.id === seededBookingId)).toBe(false);
    expect(state.lastAction).toEqual({ label: 'cancelBooking', ok: true });
  });
});

describe('toggleCenterBlockingEvent', () => {
  it('removes and restores the Professional Development Day event', () => {
    const { directory } = getCalendarStoreState();
    const blockingEventId = directory.events.centerBlockingEvent;

    expect(getCalendarStoreState().isBlockingEventActive).toBe(true);
    expect(getCalendarStoreState().snapshot.events.some((e) => e.id === blockingEventId)).toBe(true);

    toggleCenterBlockingEvent(false);
    let state = getCalendarStoreState();
    expect(state.isBlockingEventActive).toBe(false);
    expect(state.snapshot.events.some((e) => e.id === blockingEventId)).toBe(false);

    toggleCenterBlockingEvent(true);
    state = getCalendarStoreState();
    expect(state.isBlockingEventActive).toBe(true);
    const restored = state.snapshot.events.find((e) => e.id === blockingEventId);
    expect(restored).toBeDefined();
    expect(restored?.title).toBe('Professional Development Day');
  });
});

describe('resetToSeed', () => {
  it('restores the store to a fresh seeded state', () => {
    cancelBooking(getCalendarStoreState().directory.bookings.priyaAdHocWithAda);
    toggleCenterBlockingEvent(false);
    expect(getCalendarStoreState().snapshot.bookings).toHaveLength(2);
    expect(getCalendarStoreState().isBlockingEventActive).toBe(false);

    resetToSeed();

    const state = getCalendarStoreState();
    expect(state.snapshot.bookings).toHaveLength(3);
    expect(state.isBlockingEventActive).toBe(true);
    expect(state.selectedCalendarId).toBe(state.directory.teachers.ada.calendarId);
    expect(state.bookingDraft).toBeNull();
    expect(state.lastAction).toBeNull();
  });
});
