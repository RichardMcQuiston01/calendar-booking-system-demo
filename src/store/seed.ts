import {
  applyAvailabilityRule,
  applyBooking,
  applyEvent,
  applySlot,
  putCalendar,
  putEntity,
  putEntityCalendar,
} from '@richardmcquiston01/calendar-booking-system';
import type {
  CalendarSnapshot,
  DateOnly,
  Instant,
  Result,
  TimeZone,
  Uuid,
} from '@richardmcquiston01/calendar-booking-system';
import { createId } from './ids';
import { nowInstant, zonedTimeToInstant } from './timezone';

/** Directory of every seeded id, for panels to look up "who/what is this". */
export interface DemoDirectory {
  weekStart: DateOnly;
  center: { entityId: Uuid; calendarId: Uuid; timeZone: TimeZone };
  teachers: {
    ada: { entityId: Uuid; calendarId: Uuid; timeZone: TimeZone; rollsUp: boolean };
    sam: { entityId: Uuid; calendarId: Uuid; timeZone: TimeZone; rollsUp: boolean };
  };
  students: {
    priya: Uuid;
    marcus: Uuid;
  };
  events: {
    adaStaffMeeting: Uuid;
    samReadingCircle: Uuid;
    centerBlockingEvent: Uuid;
  };
  slots: {
    adaGroupSlot: Uuid;
  };
  bookings: {
    priyaAdHocWithAda: Uuid;
    marcusInGroupSlot: Uuid;
    priyaAdHocWithSam: Uuid;
  };
}

export interface SeedResult {
  snapshot: CalendarSnapshot;
  directory: DemoDirectory;
}

/** Unwrap an engine `Result`, throwing loudly — seed data must never conflict or fail validation. */
function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`Seed data invalid (${result.error.code}): ${result.error.message}`);
  }
  return result.value;
}

/** Add `days` civil days to a `YYYY-MM-DD` date, ignoring time zone. */
export function addDays(date: DateOnly, days: number): DateOnly {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/**
 * Monday of the demo week: `reference`'s date if it's already a Monday,
 * otherwise the next one. Always used instead of a hardcoded date so the
 * deployed demo's "this week" never goes stale.
 */
export function getDemoWeekStart(reference: Date = new Date()): DateOnly {
  const utcWeekday = reference.getUTCDay(); // 0 = Sunday .. 6 = Saturday
  const daysSinceMonday = (utcWeekday + 6) % 7; // Monday = 0 .. Sunday = 6
  const daysUntilMonday = daysSinceMonday === 0 ? 0 : 7 - daysSinceMonday;
  return new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate() + daysUntilMonday),
  )
    .toISOString()
    .slice(0, 10);
}

const CENTER_TZ: TimeZone = 'America/Chicago';
const ADA_TZ: TimeZone = 'America/New_York';
const SAM_TZ: TimeZone = 'America/Los_Angeles';

/** Builds the "Riverside Tutoring Center" demo scenario described in PLAN.md. */
export function buildSeed(now: Instant = nowInstant()): SeedResult {
  const opts = { now };
  const weekStart = getDemoWeekStart(new Date(now));
  const tuesday = addDays(weekStart, 1);
  const wednesday = addDays(weekStart, 2);
  const thursday = addDays(weekStart, 3);
  const friday = addDays(weekStart, 4);
  const saturday = addDays(weekStart, 5);
  const wednesdayThreeWeeksOut = addDays(wednesday, 21);

  const centerId = createId();
  const adaId = createId();
  const samId = createId();
  const priyaId = createId();
  const marcusId = createId();

  let snapshot: CalendarSnapshot = {
    entities: [],
    calendars: [],
    entityCalendars: [],
    events: [],
    availabilityRules: [],
    slots: [],
    bookings: [],
  };

  // --- Entities -----------------------------------------------------------
  ({ snapshot } = unwrap(
    putEntity(snapshot, { id: centerId, entityType: 'center', name: 'Riverside Tutoring Center' }, opts),
  ));
  ({ snapshot } = unwrap(
    putEntity(snapshot, { id: adaId, entityType: 'teacher', name: 'Ada Lin', parentId: centerId }, opts),
  ));
  ({ snapshot } = unwrap(
    putEntity(snapshot, { id: samId, entityType: 'teacher', name: 'Sam Osei', parentId: centerId }, opts),
  ));
  ({ snapshot } = unwrap(
    putEntity(snapshot, { id: priyaId, entityType: 'student', name: 'Priya Shah', parentId: centerId }, opts),
  ));
  ({ snapshot } = unwrap(
    putEntity(snapshot, { id: marcusId, entityType: 'student', name: 'Marcus Webb', parentId: centerId }, opts),
  ));

  // --- Calendars ------------------------------------------------------------
  const centerCalendarId = createId();
  const adaCalendarId = createId();
  const samCalendarId = createId();

  ({ snapshot } = unwrap(
    putCalendar(snapshot, { id: centerCalendarId, timeZone: CENTER_TZ, inheritance: 'none' }, opts),
  ));
  ({ snapshot } = unwrap(
    putCalendar(snapshot, { id: adaCalendarId, timeZone: ADA_TZ, inheritance: 'both' }, opts),
  ));
  ({ snapshot } = unwrap(
    putCalendar(snapshot, { id: samCalendarId, timeZone: SAM_TZ, inheritance: 'inherit-blocks' }, opts),
  ));

  // --- Entity <-> calendar links --------------------------------------------
  ({ snapshot } = unwrap(
    putEntityCalendar(
      snapshot,
      { id: createId(), entityId: centerId, calendarId: centerCalendarId },
      opts,
    ),
  ));
  ({ snapshot } = unwrap(
    putEntityCalendar(snapshot, { id: createId(), entityId: adaId, calendarId: adaCalendarId }, opts),
  ));
  ({ snapshot } = unwrap(
    putEntityCalendar(snapshot, { id: createId(), entityId: samId, calendarId: samCalendarId }, opts),
  ));

  // --- Availability rules -----------------------------------------------------
  ({ snapshot } = unwrap(
    applyAvailabilityRule(snapshot, {
      id: createId(),
      calendarId: adaCalendarId,
      startTime: '08:00',
      endTime: '15:00',
      recurrence: { freq: 'weekly', byDay: ['MO', 'TU', 'WE', 'TH', 'FR'] },
    }, opts),
  ));
  ({ snapshot } = unwrap(
    applyAvailabilityRule(snapshot, {
      id: createId(),
      calendarId: samCalendarId,
      startTime: '09:00',
      endTime: '17:00',
      recurrence: { freq: 'weekly', byDay: ['MO', 'TU', 'WE', 'TH', 'FR'] },
    }, opts),
  ));

  // --- Recurring + one-off events -------------------------------------------
  const adaStaffMeetingId = createId();
  ({ snapshot } = unwrap(
    applyEvent(
      snapshot,
      {
        id: adaStaffMeetingId,
        calendarId: adaCalendarId,
        title: 'Staff Meeting',
        start: zonedTimeToInstant(wednesday, '12:00', ADA_TZ),
        end: zonedTimeToInstant(wednesday, '12:30', ADA_TZ),
        timeZone: ADA_TZ,
        occupancy: { kind: 'exclusive' },
        recurrence: { freq: 'weekly' },
        excludedDates: [wednesdayThreeWeeksOut],
      },
      opts,
    ),
  ));

  const samReadingCircleId = createId();
  ({ snapshot } = unwrap(
    applyEvent(
      snapshot,
      {
        id: samReadingCircleId,
        calendarId: samCalendarId,
        title: 'Reading Circle',
        start: zonedTimeToInstant(thursday, '11:00', SAM_TZ),
        end: zonedTimeToInstant(thursday, '11:30', SAM_TZ),
        timeZone: SAM_TZ,
        occupancy: { kind: 'exclusive' },
        recurrence: { freq: 'weekly' },
      },
      opts,
    ),
  ));

  const centerBlockingEventId = createId();
  ({ snapshot } = unwrap(
    applyEvent(
      snapshot,
      {
        id: centerBlockingEventId,
        calendarId: centerCalendarId,
        title: 'Professional Development Day',
        start: zonedTimeToInstant(friday, '00:00', CENTER_TZ),
        end: zonedTimeToInstant(saturday, '00:00', CENTER_TZ),
        timeZone: CENTER_TZ,
        occupancy: { kind: 'exclusive' },
      },
      opts,
    ),
  ));

  // --- Bookable slot ----------------------------------------------------------
  const adaGroupSlotId = createId();
  const groupSlotStart = zonedTimeToInstant(tuesday, '10:00', ADA_TZ);
  const groupSlotEnd = zonedTimeToInstant(tuesday, '11:00', ADA_TZ);
  ({ snapshot } = unwrap(
    applySlot(
      snapshot,
      {
        id: adaGroupSlotId,
        calendarId: adaCalendarId,
        start: groupSlotStart,
        end: groupSlotEnd,
        occupancy: { kind: 'capacity', max: 3 },
      },
      opts,
    ),
  ));

  // --- Seed bookings ------------------------------------------------------------
  const priyaAdHocWithAdaId = createId();
  ({ snapshot } = unwrap(
    applyBooking(
      snapshot,
      {
        id: priyaAdHocWithAdaId,
        calendarId: adaCalendarId,
        start: zonedTimeToInstant(tuesday, '09:30', ADA_TZ),
        end: zonedTimeToInstant(tuesday, '10:00', ADA_TZ),
        attendeeId: priyaId,
      },
      opts,
    ),
  ));

  const marcusInGroupSlotId = createId();
  ({ snapshot } = unwrap(
    applyBooking(
      snapshot,
      {
        id: marcusInGroupSlotId,
        calendarId: adaCalendarId,
        start: groupSlotStart,
        end: groupSlotEnd,
        slotId: adaGroupSlotId,
        attendeeId: marcusId,
      },
      opts,
    ),
  ));

  const priyaAdHocWithSamId = createId();
  ({ snapshot } = unwrap(
    applyBooking(
      snapshot,
      {
        id: priyaAdHocWithSamId,
        calendarId: samCalendarId,
        start: zonedTimeToInstant(thursday, '14:00', SAM_TZ),
        end: zonedTimeToInstant(thursday, '14:30', SAM_TZ),
        attendeeId: priyaId,
      },
      opts,
    ),
  ));

  return {
    snapshot,
    directory: {
      weekStart,
      center: { entityId: centerId, calendarId: centerCalendarId, timeZone: CENTER_TZ },
      teachers: {
        ada: { entityId: adaId, calendarId: adaCalendarId, timeZone: ADA_TZ, rollsUp: true },
        sam: { entityId: samId, calendarId: samCalendarId, timeZone: SAM_TZ, rollsUp: false },
      },
      students: { priya: priyaId, marcus: marcusId },
      events: {
        adaStaffMeeting: adaStaffMeetingId,
        samReadingCircle: samReadingCircleId,
        centerBlockingEvent: centerBlockingEventId,
      },
      slots: { adaGroupSlot: adaGroupSlotId },
      bookings: {
        priyaAdHocWithAda: priyaAdHocWithAdaId,
        marcusInGroupSlot: marcusInGroupSlotId,
        priyaAdHocWithSam: priyaAdHocWithSamId,
      },
    },
  };
}
