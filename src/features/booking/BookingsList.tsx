import { formatInstant, useCalendarStore } from '../../store';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { calendarTimeZone } from './bookingHelpers';

/** Lists bookings on the currently selected calendar, with cancellation. */
export function BookingsList() {
  const store = useCalendarStore();
  const { directory, snapshot, selectedCalendarId, cancelBooking } = store;

  const timeZone = calendarTimeZone(directory, selectedCalendarId);
  const bookings = snapshot.bookings
    .filter((booking) => booking.calendarId === selectedCalendarId)
    .sort((a, b) => a.start.localeCompare(b.start));

  return (
    <Card title="Bookings">
      {bookings.length === 0 ? (
        <p className="text-sm text-brand-700">No bookings on this calendar yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {bookings.map((booking) => (
            <li
              key={booking.id}
              className="flex items-center justify-between gap-2 rounded-md border border-brand-100 px-3 py-2 text-sm"
            >
              <span className="text-brand-900">
                {formatInstant(booking.start, timeZone)} – {formatInstant(booking.end, timeZone, { timeStyle: 'short' })}
                {booking.slotId ? ' · slot' : ''}
              </span>
              <Button variant="danger" onClick={() => cancelBooking(booking.id)}>
                Cancel
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
