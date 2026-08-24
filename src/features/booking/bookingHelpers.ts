import type {
  BookableSlot,
  CalendarSnapshot,
  ClockTime,
  Instant,
  TimeZone,
  Uuid,
} from '@richardmcquiston01/calendar-booking-system';
import type { DemoDirectory } from '../../store';

/** Resolve a seeded calendar id (center/Ada/Sam) to its IANA time zone. */
export function calendarTimeZone(directory: DemoDirectory, calendarId: Uuid): TimeZone {
  if (calendarId === directory.center.calendarId) return directory.center.timeZone;
  if (calendarId === directory.teachers.ada.calendarId) return directory.teachers.ada.timeZone;
  if (calendarId === directory.teachers.sam.calendarId) return directory.teachers.sam.timeZone;
  return 'UTC';
}

/** Human-readable label for a seeded calendar id, for display in forms/lists. */
export function calendarLabel(directory: DemoDirectory, calendarId: Uuid): string {
  if (calendarId === directory.center.calendarId) return 'Riverside Tutoring Center';
  if (calendarId === directory.teachers.ada.calendarId) return 'Ada Lin';
  if (calendarId === directory.teachers.sam.calendarId) return 'Sam Osei';
  return 'Unknown calendar';
}

/** Civil clock time (`HH:mm`) of `instant` rendered in `timeZone`. */
export function clockTimeInZone(instant: Instant, timeZone: TimeZone): ClockTime {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(instant));
}

/** Find a bookable slot by id in the current snapshot. */
export function findSlot(snapshot: CalendarSnapshot, slotId: Uuid): BookableSlot | undefined {
  return snapshot.slots.find((slot) => slot.id === slotId);
}
