import { useMemo } from 'react';
import { queryAvailability } from '@richardmcquiston01/calendar-booking-system';
import type { Occurrence, TimeRange, Uuid } from '@richardmcquiston01/calendar-booking-system';
import { formatInstant, useCalendarStore } from '../../store';
import type { DemoDirectory } from '../../store';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Shifts both bounds of a range by `days` civil days worth of milliseconds. */
function shiftRange(range: TimeRange, days: number): TimeRange {
  return {
    start: new Date(new Date(range.start).getTime() + days * DAY_MS).toISOString(),
    end: new Date(new Date(range.end).getTime() + days * DAY_MS).toISOString(),
  };
}

/** Resolves the IANA zone to display times in for whichever calendar is selected. */
function timeZoneFor(directory: DemoDirectory, calendarId: Uuid): string {
  if (calendarId === directory.center.calendarId) return directory.center.timeZone;
  if (calendarId === directory.teachers.ada.calendarId) return directory.teachers.ada.timeZone;
  if (calendarId === directory.teachers.sam.calendarId) return directory.teachers.sam.timeZone;
  return directory.center.timeZone;
}

/**
 * The one calendar picker in the app, week navigation, and open-interval
 * availability for the selected calendar — clicking an interval seeds a
 * booking draft for Workstream C's booking form to pick up.
 */
export function AvailabilityPanel() {
  const store = useCalendarStore();
  const { directory, selectedCalendarId, selectedRange } = store;

  const calendarOptions: Array<{ id: Uuid; label: string }> = [
    { id: directory.center.calendarId, label: 'Riverside Tutoring Center' },
    { id: directory.teachers.ada.calendarId, label: 'Ada Lin' },
    { id: directory.teachers.sam.calendarId, label: 'Sam Osei' },
  ];

  const timeZone = timeZoneFor(directory, selectedCalendarId);

  const report = useMemo(
    () => queryAvailability(store.snapshot, selectedCalendarId, selectedRange),
    [store.snapshot, selectedCalendarId, selectedRange],
  );

  const intervals: Occurrence[] = report.ok ? report.value.intervals : [];

  return (
    <Card
      title="Availability"
      actions={
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => store.setSelectedRange(shiftRange(selectedRange, -7))}
          >
            ← Prev week
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => store.setSelectedRange(shiftRange(selectedRange, 7))}
          >
            Next week →
          </Button>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Select calendar">
        {calendarOptions.map((option) => {
          const isSelected = option.id === selectedCalendarId;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => store.selectCalendar(option.id)}
              aria-pressed={isSelected}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${
                isSelected
                  ? 'bg-brand-700 text-white'
                  : 'bg-brand-100 text-brand-900 hover:bg-brand-200'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {!report.ok && (
        <p className="text-sm text-red-700">Unable to load availability: {report.error.message}</p>
      )}

      {report.ok && intervals.length === 0 && (
        <p className="text-sm text-brand-700">No open intervals in this range.</p>
      )}

      {report.ok && intervals.length > 0 && (
        <ul className="space-y-2">
          {intervals.map((interval) => (
            <li
              key={`${interval.start}-${interval.end}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-brand-100 p-2"
            >
              <span className="text-sm text-brand-900">
                {formatInstant(interval.start, timeZone)} – {formatInstant(interval.end, timeZone)}
              </span>
              <Button
                type="button"
                variant="primary"
                onClick={() =>
                  store.setBookingDraft({
                    calendarId: selectedCalendarId,
                    start: interval.start,
                    end: interval.end,
                  })
                }
              >
                Book this slot
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
