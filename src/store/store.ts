import { useSyncExternalStore } from 'react';
import {
  applyBooking,
  applyEvent,
  cancelBooking as engineCancelBooking,
  checkBooking,
  deleteEvent,
} from '@richardmcquiston01/calendar-booking-system';
import type {
  ApplySuccess,
  Booking,
  BookingInput,
  CalendarEvent,
  CalendarSnapshot,
  CheckReport,
  EventInput,
  Instant,
  Result,
  TimeRange,
  TimeZone,
  Uuid,
} from '@richardmcquiston01/calendar-booking-system';
import { addDays, buildSeed, type DemoDirectory } from './seed';
import { nowInstant, zonedTimeToInstant } from './timezone';

/** Prefills the booking form from a clicked-on open interval or slot. */
export interface BookingDraft {
  calendarId: Uuid;
  start: Instant;
  end: Instant;
  slotId?: Uuid;
}

/** Outcome of the last store-driven engine call, surfaced for the UI. */
export interface LastAction {
  label: string;
  ok: boolean;
  message?: string;
}

export interface CalendarStoreState {
  snapshot: CalendarSnapshot;
  directory: DemoDirectory;
  selectedCalendarId: Uuid;
  selectedRange: TimeRange;
  bookingDraft: BookingDraft | null;
  isBlockingEventActive: boolean;
  lastAction: LastAction | null;
}

export interface CalendarStore extends CalendarStoreState {
  selectCalendar(calendarId: Uuid): void;
  setSelectedRange(range: TimeRange): void;
  setBookingDraft(draft: BookingDraft | null): void;
  previewBooking(input: BookingInput): Result<CheckReport>;
  bookAppointment(input: BookingInput, allowConflicts?: boolean): Result<ApplySuccess<Booking>>;
  cancelBooking(bookingId: Uuid): void;
  toggleCenterBlockingEvent(active: boolean): void;
  resetToSeed(): void;
}

function toEventInput(event: CalendarEvent): EventInput {
  return {
    id: event.id,
    calendarId: event.calendarId,
    title: event.title,
    start: event.start,
    end: event.end,
    timeZone: event.timeZone,
    occupancy: event.occupancy,
    recurrence: event.recurrence,
    excludedDates: event.excludedDates,
  };
}

function defaultRangeFor(directory: DemoDirectory, timeZone: TimeZone): TimeRange {
  const weekEnd = addDays(directory.weekStart, 7);
  return {
    start: zonedTimeToInstant(directory.weekStart, '00:00', timeZone),
    end: zonedTimeToInstant(weekEnd, '00:00', timeZone),
  };
}

type Listener = () => void;

const listeners = new Set<Listener>();
let state: CalendarStoreState;
let blockingEventTemplate: EventInput;

function createInitialState(): CalendarStoreState {
  const { snapshot, directory } = buildSeed();
  const blockingEvent = snapshot.events.find((event) => event.id === directory.events.centerBlockingEvent);
  if (!blockingEvent) {
    throw new Error('Seed data is missing the center blocking event');
  }
  blockingEventTemplate = toEventInput(blockingEvent);

  return {
    snapshot,
    directory,
    selectedCalendarId: directory.teachers.ada.calendarId,
    selectedRange: defaultRangeFor(directory, directory.teachers.ada.timeZone),
    bookingDraft: null,
    isBlockingEventActive: true,
    lastAction: null,
  };
}

state = createInitialState();

/** Read the current store state without subscribing — used outside React (tests, non-hook code). */
export function getCalendarStoreState(): CalendarStoreState {
  return state;
}

function getState(): CalendarStoreState {
  return state;
}

function setState(patch: Partial<CalendarStoreState>): void {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function selectCalendar(calendarId: Uuid): void {
  setState({ selectedCalendarId: calendarId });
}

export function setSelectedRange(range: TimeRange): void {
  setState({ selectedRange: range });
}

export function setBookingDraft(draft: BookingDraft | null): void {
  setState({ bookingDraft: draft });
}

export function previewBooking(input: BookingInput): Result<CheckReport> {
  return checkBooking(state.snapshot, input);
}

export function bookAppointment(input: BookingInput, allowConflicts = false): Result<ApplySuccess<Booking>> {
  const result = applyBooking(state.snapshot, input, { allowConflicts, now: nowInstant() });
  if (result.ok) {
    setState({
      snapshot: result.value.snapshot,
      bookingDraft: null,
      lastAction: { label: 'bookAppointment', ok: true },
    });
  } else {
    setState({ lastAction: { label: 'bookAppointment', ok: false, message: result.error.message } });
  }
  return result;
}

export function cancelBooking(bookingId: Uuid): void {
  const result = engineCancelBooking(state.snapshot, bookingId);
  if (result.ok) {
    setState({ snapshot: result.value, lastAction: { label: 'cancelBooking', ok: true } });
  } else {
    setState({ lastAction: { label: 'cancelBooking', ok: false, message: result.error.message } });
  }
}

export function toggleCenterBlockingEvent(active: boolean): void {
  if (active === state.isBlockingEventActive) return;

  if (active) {
    const result = applyEvent(state.snapshot, blockingEventTemplate, { now: nowInstant() });
    if (result.ok) {
      setState({
        snapshot: result.value.snapshot,
        isBlockingEventActive: true,
        lastAction: { label: 'toggleCenterBlockingEvent', ok: true },
      });
    } else {
      setState({
        lastAction: { label: 'toggleCenterBlockingEvent', ok: false, message: result.error.message },
      });
    }
    return;
  }

  const result = deleteEvent(state.snapshot, state.directory.events.centerBlockingEvent, {
    now: nowInstant(),
  });
  if (result.ok) {
    setState({
      snapshot: result.value,
      isBlockingEventActive: false,
      lastAction: { label: 'toggleCenterBlockingEvent', ok: true },
    });
  } else {
    setState({
      lastAction: { label: 'toggleCenterBlockingEvent', ok: false, message: result.error.message },
    });
  }
}

export function resetToSeed(): void {
  state = createInitialState();
  listeners.forEach((listener) => listener());
}

/**
 * Singleton calendar store backed by `useSyncExternalStore` — no external
 * state library. Every panel reads through this one hook.
 */
export function useCalendarStore(): CalendarStore {
  const current = useSyncExternalStore(subscribe, getState);
  return {
    ...current,
    selectCalendar,
    setSelectedRange,
    setBookingDraft,
    previewBooking,
    bookAppointment,
    cancelBooking,
    toggleCenterBlockingEvent,
    resetToSeed,
  };
}
