import { useMemo } from 'react';
import { expandRecurrence } from '@richardmcquiston01/calendar-booking-system';
import type { CalendarEvent, Occurrence, TimeRange } from '@richardmcquiston01/calendar-booking-system';
import { addDays, formatInstant, useCalendarStore, zonedTimeToInstant } from '../../store';
import { Card } from '../../ui/Card';

/** Half-open UTC range spanning the full 7-day demo week in `timeZone`. */
function demoWeekRange(weekStart: string, timeZone: string): TimeRange {
  return {
    start: zonedTimeToInstant(weekStart, '00:00', timeZone),
    end: zonedTimeToInstant(addDays(weekStart, 7), '00:00', timeZone),
  };
}

interface RecurrenceResult {
  label: string;
  timeZone: string;
  occurrences: Occurrence[];
  error?: string;
}

function recurrenceResultFor(
  label: string,
  event: CalendarEvent | undefined,
  range: TimeRange,
  timeZone: string,
): RecurrenceResult {
  if (!event) {
    return { label, timeZone, occurrences: [], error: 'Event not found in snapshot.' };
  }
  const result = expandRecurrence(event, range, timeZone);
  if (!result.ok) {
    return { label, timeZone, occurrences: [], error: result.error.message };
  }
  return { label, timeZone, occurrences: result.value };
}

function RecurrenceList({ result }: { result: RecurrenceResult }) {
  return (
    <div className="flex-1 rounded-md border border-brand-100 p-3">
      <p className="mb-2 text-sm font-semibold text-brand-900">{result.label}</p>
      {result.error ? (
        <p className="text-sm text-red-700">{result.error}</p>
      ) : result.occurrences.length > 0 ? (
        <ul className="space-y-1 text-sm text-gray-700">
          {result.occurrences.map((occurrence) => (
            <li key={`${occurrence.start}-${occurrence.end}`}>
              {formatInstant(occurrence.start, result.timeZone)} – {formatInstant(occurrence.end, result.timeZone)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-600">No occurrences this week.</p>
      )}
    </div>
  );
}

/**
 * Raw snapshot / last-action JSON inspector, plus the one place in the app that
 * exercises `expandRecurrence` directly: each teacher's weekly recurring event,
 * expanded into concrete occurrences over the demo week in their own time zone.
 */
export function SnapshotInspector() {
  const store = useCalendarStore();
  const { directory, snapshot, lastAction } = store;

  const recurrenceResults = useMemo(() => {
    const adaEvent = snapshot.events.find((event) => event.id === directory.events.adaStaffMeeting);
    const samEvent = snapshot.events.find((event) => event.id === directory.events.samReadingCircle);

    return {
      ada: recurrenceResultFor(
        "Ada Lin — Staff Meeting",
        adaEvent,
        demoWeekRange(directory.weekStart, directory.teachers.ada.timeZone),
        directory.teachers.ada.timeZone,
      ),
      sam: recurrenceResultFor(
        "Sam Osei — Reading Circle",
        samEvent,
        demoWeekRange(directory.weekStart, directory.teachers.sam.timeZone),
        directory.teachers.sam.timeZone,
      ),
    };
  }, [directory, snapshot]);

  return (
    <div className="flex flex-col gap-4">
      <Card title="Recurring event occurrences (expandRecurrence)">
        <div className="flex flex-col gap-3 sm:flex-row">
          <RecurrenceList result={recurrenceResults.ada} />
          <RecurrenceList result={recurrenceResults.sam} />
        </div>
      </Card>

      <Card title="Raw state inspector">
        <div className="flex flex-col gap-3">
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-brand-900">Last action</summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-gray-50 p-3 text-xs text-gray-800">
              {JSON.stringify(lastAction, null, 2)}
            </pre>
          </details>
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-brand-900">
              Snapshot (entities, calendars, events, availabilityRules, slots, bookings)
            </summary>
            <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-gray-50 p-3 text-xs text-gray-800">
              {JSON.stringify(snapshot, null, 2)}
            </pre>
          </details>
        </div>
      </Card>
    </div>
  );
}
