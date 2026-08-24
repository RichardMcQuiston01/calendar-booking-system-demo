import { useId, useMemo } from 'react';
import { effectiveExclusiveBusy, queryAvailability, queryView } from '@richardmcquiston01/calendar-booking-system';
import type { Occurrence, TimeRange, ViewItem } from '@richardmcquiston01/calendar-booking-system';
import { addDays, formatInstant, useCalendarStore, zonedTimeToInstant } from '../../store';
import type { DemoDirectory } from '../../store';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';

interface TeacherFridayState {
  label: string;
  timeZone: string;
  openIntervals: Occurrence[];
  busyIntervals: Occurrence[];
}

/** Half-open UTC range spanning one civil day (`date` 00:00 through the next day's 00:00) in `timeZone`. */
function civilDayRange(date: string, timeZone: string): TimeRange {
  return {
    start: zonedTimeToInstant(date, '00:00', timeZone),
    end: zonedTimeToInstant(addDays(date, 1), '00:00', timeZone),
  };
}

/** Half-open UTC range spanning the full 7-day demo week in `timeZone`. */
function demoWeekRange(weekStart: string, timeZone: string): TimeRange {
  return {
    start: zonedTimeToInstant(weekStart, '00:00', timeZone),
    end: zonedTimeToInstant(addDays(weekStart, 7), '00:00', timeZone),
  };
}

/** Time-only rendering (no date) for same-day interval lists. */
function formatTime(instant: string, timeZone: string): string {
  return formatInstant(instant, timeZone, { dateStyle: undefined, timeStyle: 'short' });
}

function formatIntervalList(intervals: Occurrence[], timeZone: string): string[] {
  return intervals.map((interval) => `${formatTime(interval.start, timeZone)} – ${formatTime(interval.end, timeZone)}`);
}

function FridayColumn({ state }: { state: TeacherFridayState }) {
  const isOpen = state.openIntervals.length > 0;
  return (
    <div className="flex-1 rounded-md border border-brand-100 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-brand-900">{state.label}</span>
        <Badge tone={isOpen ? 'success' : 'danger'}>{isOpen ? 'Open' : 'Closed all day'}</Badge>
      </div>
      <p className="mb-1 text-xs text-gray-500">{state.timeZone}</p>
      {isOpen ? (
        <ul className="space-y-1 text-sm text-gray-700">
          {formatIntervalList(state.openIntervals, state.timeZone).map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-600">
          No open availability — blocked by {state.busyIntervals.length} exclusive interval
          {state.busyIntervals.length === 1 ? '' : 's'} (own or inherited).
        </p>
      )}
    </div>
  );
}

function partitionRolledUpItems(
  items: ViewItem[],
  directory: DemoDirectory,
): { ada: ViewItem[]; sam: ViewItem[] } {
  const ada: ViewItem[] = [];
  const sam: ViewItem[] = [];
  for (const item of items) {
    if (item.calendarId === directory.teachers.ada.calendarId) {
      ada.push(item);
    } else if (item.calendarId === directory.teachers.sam.calendarId) {
      sam.push(item);
    }
  }
  return { ada, sam };
}

function RollUpColumn({
  teacherLabel,
  timeZone,
  rollsUp,
  items,
}: {
  teacherLabel: string;
  timeZone: string;
  rollsUp: boolean;
  items: ViewItem[];
}) {
  return (
    <div className="flex-1 rounded-md border border-brand-100 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-brand-900">{teacherLabel}</span>
        <Badge tone={rollsUp ? 'rolled-up' : 'neutral'}>{rollsUp ? 'Rolls up' : 'Does not roll up'}</Badge>
      </div>
      {rollsUp ? (
        items.length > 0 ? (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 text-sm text-gray-700">
                <span>
                  {item.title ?? 'Untitled'}
                  <span className="ml-2 text-xs text-gray-500">
                    {formatInstant(item.start, timeZone)} – {formatInstant(item.end, timeZone)}
                  </span>
                </span>
                <Badge tone={item.source}>{item.source}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-600">No items this week.</p>
        )
      ) : (
        <p className="text-sm text-gray-600">
          {teacherLabel}&apos;s calendar doesn&apos;t roll up to the Center (inheritance mode is
          &ldquo;inherit-blocks&rdquo;, which doesn&apos;t include roll-up), so her/his own events never appear
          on the Center&apos;s rolled-up view.
        </p>
      )}
    </div>
  );
}

/**
 * Section 1 shows the Center's toggleable "Professional Development Day" blocking event
 * shrinking both teachers' Friday availability identically (via inherited blocks). Section 2
 * is a static roll-up comparison: only Ada's calendar (inheritance `both`) rolls its own events
 * up to the Center's view; Sam's (`inherit-blocks`) never does.
 */
export function InheritancePanel() {
  const store = useCalendarStore();
  const { directory, snapshot, isBlockingEventActive } = store;
  const toggleId = useId();

  const fridayStates = useMemo<{ ada: TeacherFridayState; sam: TeacherFridayState }>(() => {
    const friday = addDays(directory.weekStart, 4);

    function stateFor(label: string, calendarId: string, timeZone: string): TeacherFridayState {
      const range = civilDayRange(friday, timeZone);
      const availability = queryAvailability(snapshot, calendarId, range);
      const busy = effectiveExclusiveBusy(snapshot, calendarId, range);
      return {
        label,
        timeZone,
        openIntervals: availability.ok ? availability.value.intervals : [],
        busyIntervals: busy.ok ? busy.value : [],
      };
    }

    return {
      ada: stateFor('Ada Lin', directory.teachers.ada.calendarId, directory.teachers.ada.timeZone),
      sam: stateFor('Sam Osei', directory.teachers.sam.calendarId, directory.teachers.sam.timeZone),
    };
  }, [directory, snapshot]);

  const rollUp = useMemo(() => {
    const range = demoWeekRange(directory.weekStart, directory.center.timeZone);
    const view = queryView(snapshot, directory.center.calendarId, range);
    const items = view.ok ? view.value.items : [];
    return partitionRolledUpItems(items, directory);
  }, [directory, snapshot]);

  return (
    <div className="flex flex-col gap-4">
      <Card title="Center-wide blocking event">
        <div className="mb-4 flex items-center gap-2">
          <input
            id={toggleId}
            type="checkbox"
            className="h-4 w-4 rounded border-brand-300 text-brand-700 focus:ring-2 focus:ring-brand-500"
            checked={isBlockingEventActive}
            onChange={(event) => store.toggleCenterBlockingEvent(event.target.checked)}
          />
          <label htmlFor={toggleId} className="text-sm text-gray-800">
            &ldquo;Professional Development Day&rdquo; active (Friday, Center calendar, exclusive, all day)
          </label>
        </div>
        <p className="mb-3 text-sm text-gray-600">
          Ada&apos;s calendar (<code>both</code>) and Sam&apos;s calendar (<code>inherit-blocks</code>) both
          inherit ancestor blocks, so toggling this event shrinks Friday identically for both teachers even
          though they sit in different time zones.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <FridayColumn state={fridayStates.ada} />
          <FridayColumn state={fridayStates.sam} />
        </div>
      </Card>

      <Card title="Roll-up comparison (this week, Center's view)">
        <p className="mb-3 text-sm text-gray-600">
          Only calendars with inheritance <code>both</code> roll their own events up to an ancestor&apos;s
          view. Ada&apos;s does (<code>rollsUp: {String(directory.teachers.ada.rollsUp)}</code>); Sam&apos;s
          doesn&apos;t (<code>rollsUp: {String(directory.teachers.sam.rollsUp)}</code>).
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <RollUpColumn
            teacherLabel="Ada Lin"
            timeZone={directory.teachers.ada.timeZone}
            rollsUp={directory.teachers.ada.rollsUp}
            items={rollUp.ada}
          />
          <RollUpColumn
            teacherLabel="Sam Osei"
            timeZone={directory.teachers.sam.timeZone}
            rollsUp={directory.teachers.sam.rollsUp}
            items={rollUp.sam}
          />
        </div>
      </Card>
    </div>
  );
}
