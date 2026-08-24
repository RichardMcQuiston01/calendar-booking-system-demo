import { useMemo } from 'react';
import { queryView } from '@richardmcquiston01/calendar-booking-system';
import type { ViewItem, Uuid } from '@richardmcquiston01/calendar-booking-system';
import { formatInstant, useCalendarStore } from '../../store';
import type { DemoDirectory } from '../../store';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';

/** Resolves the IANA zone to display times in for whichever calendar is selected. */
function timeZoneFor(directory: DemoDirectory, calendarId: Uuid): string {
  if (calendarId === directory.center.calendarId) return directory.center.timeZone;
  if (calendarId === directory.teachers.ada.calendarId) return directory.teachers.ada.timeZone;
  if (calendarId === directory.teachers.sam.calendarId) return directory.teachers.sam.timeZone;
  return directory.center.timeZone;
}

/**
 * Renders every own/inherited/rolled-up event, slot, and booking that
 * intersects the selected range on the selected calendar.
 */
export function CalendarViewPanel() {
  const store = useCalendarStore();
  const { directory, selectedCalendarId, selectedRange } = store;

  const timeZone = timeZoneFor(directory, selectedCalendarId);

  const view = useMemo(
    () => queryView(store.snapshot, selectedCalendarId, selectedRange),
    [store.snapshot, selectedCalendarId, selectedRange],
  );

  const items: ViewItem[] = view.ok ? view.value.items : [];

  return (
    <Card title="Calendar view">
      {!view.ok && (
        <p className="text-sm text-red-700">Unable to load calendar view: {view.error.message}</p>
      )}

      {view.ok && items.length === 0 && (
        <p className="text-sm text-brand-700">Nothing scheduled in this range.</p>
      )}

      {view.ok && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Card className="border-brand-100 shadow-none">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone={item.source}>{item.source}</Badge>
                    <span className="text-sm font-medium text-brand-900">{item.title ?? item.type}</span>
                  </div>
                  <span className="text-sm text-brand-700">
                    {formatInstant(item.start, timeZone)} – {formatInstant(item.end, timeZone)}
                  </span>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
