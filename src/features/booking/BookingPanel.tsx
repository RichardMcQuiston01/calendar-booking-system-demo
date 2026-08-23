import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { BookingInput, CheckReport, ClockTime, DateOnly, Result, Uuid } from '@richardmcquiston01/calendar-booking-system';
import { createId, formatInstant, toDateOnly, useCalendarStore, zonedTimeToInstant } from '../../store';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { calendarLabel, calendarTimeZone, clockTimeInZone, findSlot } from './bookingHelpers';

const DEBOUNCE_MS = 300;

/** Debounces a primitive value, re-emitting it only after `delayMs` of no further changes. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

/**
 * The actual check-then-book form. Mounted fresh (via a `key` on the
 * exported `BookingPanel` below) each time the booking draft — or, absent a
 * draft, the shared calendar selection — changes, so its local state always
 * starts from the right prefill without needing to sync props into state
 * inside an effect.
 */
function BookingForm() {
  const store = useCalendarStore();
  const { directory, snapshot, selectedCalendarId, bookingDraft, previewBooking, bookAppointment } = store;

  // Fixed for the lifetime of this form instance — a new draft or calendar
  // selection remounts the whole form (see the `key` on `BookingPanel`).
  const [calendarId] = useState<Uuid>(() => bookingDraft?.calendarId ?? selectedCalendarId);
  const [slotId, setSlotId] = useState<Uuid | undefined>(() => bookingDraft?.slotId);
  const [date, setDate] = useState<DateOnly>(() =>
    bookingDraft ? toDateOnly(bookingDraft.start, calendarTimeZone(directory, bookingDraft.calendarId)) : '',
  );
  const [startTimeStr, setStartTimeStr] = useState<ClockTime>(() =>
    bookingDraft ? clockTimeInZone(bookingDraft.start, calendarTimeZone(directory, bookingDraft.calendarId)) : '',
  );
  const [endTimeStr, setEndTimeStr] = useState<ClockTime>(() =>
    bookingDraft ? clockTimeInZone(bookingDraft.end, calendarTimeZone(directory, bookingDraft.calendarId)) : '',
  );
  const [attendeeId, setAttendeeId] = useState<Uuid>(directory.students.priya);
  const [overrideConflicts, setOverrideConflicts] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; message: string } | null>(null);
  // Stable throwaway id for the live preview — generated once per form mount.
  const [previewId] = useState<Uuid>(() => createId());

  const timeZone = calendarTimeZone(directory, calendarId);
  const isAdaCalendar = calendarId === directory.teachers.ada.calendarId;
  const groupSlot = findSlot(snapshot, directory.slots.adaGroupSlot);
  const activeSlot = slotId ? findSlot(snapshot, slotId) : undefined;

  function selectAdHocMode() {
    setSlotId(undefined);
  }

  function selectGroupSlotMode() {
    if (!groupSlot) return;
    const tz = calendarTimeZone(directory, groupSlot.calendarId);
    setSlotId(groupSlot.id);
    setDate(toDateOnly(groupSlot.start, tz));
    setStartTimeStr(clockTimeInZone(groupSlot.start, tz));
    setEndTimeStr(clockTimeInZone(groupSlot.end, tz));
  }

  // In slot mode the interval is forced to the slot's own bounds; otherwise
  // it's built from the free-typed date/time fields in the calendar's zone.
  const computedStart = activeSlot
    ? activeSlot.start
    : date && startTimeStr
      ? zonedTimeToInstant(date, startTimeStr, timeZone)
      : undefined;
  const computedEnd = activeSlot
    ? activeSlot.end
    : date && endTimeStr
      ? zonedTimeToInstant(date, endTimeStr, timeZone)
      : undefined;

  const candidateKey =
    computedStart && computedEnd ? `${calendarId}|${computedStart}|${computedEnd}|${slotId ?? ''}|${attendeeId}` : '';
  const debouncedKey = useDebouncedValue(candidateKey, DEBOUNCE_MS);

  // Derived, not stored: once the debounce catches up to the current
  // candidate, compute the live preview straight from state during render.
  const preview: Result<CheckReport> | null =
    debouncedKey !== '' && debouncedKey === candidateKey && computedStart && computedEnd
      ? previewBooking({ id: previewId, calendarId, start: computedStart, end: computedEnd, slotId, attendeeId })
      : null;

  const conflicts = preview && preview.ok ? preview.value.conflicts : [];
  const hasConflicts = conflicts.length > 0;
  const previewError = preview && !preview.ok ? preview.error.message : null;
  const canSubmit = !!computedStart && !!computedEnd && !previewError && (!hasConflicts || overrideConflicts);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!computedStart || !computedEnd) return;
    const input: BookingInput = {
      id: createId(),
      calendarId,
      start: computedStart,
      end: computedEnd,
      slotId,
      attendeeId,
    };
    const result = bookAppointment(input, overrideConflicts);
    if (result.ok) {
      setSubmitResult({
        ok: true,
        message: `Booked ${formatInstant(result.value.record.start, timeZone)} – ${formatInstant(result.value.record.end, timeZone)}.`,
      });
      setOverrideConflicts(false);
    } else {
      setSubmitResult({ ok: false, message: result.error.message });
    }
  }

  return (
    <Card title="Book an appointment">
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <p className="text-sm text-brand-800">
          Booking on <strong>{calendarLabel(directory, calendarId)}</strong>
        </p>

        <label className="flex flex-col gap-1 text-sm text-brand-900">
          Attendee
          <select
            className="rounded-md border border-brand-200 px-2 py-1"
            value={attendeeId}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => setAttendeeId(event.target.value)}
          >
            <option value={directory.students.priya}>Priya Shah</option>
            <option value={directory.students.marcus}>Marcus Webb</option>
          </select>
        </label>

        {isAdaCalendar && groupSlot && (
          <fieldset className="flex flex-col gap-1 text-sm text-brand-900">
            <legend className="mb-1 font-medium">Booking type</legend>
            <label className="flex items-center gap-2">
              <input type="radio" checked={!slotId} onChange={selectAdHocMode} />
              Ad-hoc time
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={slotId === groupSlot.id} onChange={selectGroupSlotMode} />
              Group slot ({formatInstant(groupSlot.start, timeZone)} –{' '}
              {formatInstant(groupSlot.end, timeZone, { timeStyle: 'short' })}, capacity{' '}
              {groupSlot.occupancy.kind === 'capacity' ? groupSlot.occupancy.max : 1})
            </label>
          </fieldset>
        )}

        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1 text-sm text-brand-900">
            Date
            <input
              type="date"
              className="rounded-md border border-brand-200 px-2 py-1"
              value={date}
              disabled={!!activeSlot}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setDate(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-brand-900">
            Start
            <input
              type="time"
              className="rounded-md border border-brand-200 px-2 py-1"
              value={startTimeStr}
              disabled={!!activeSlot}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setStartTimeStr(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-brand-900">
            End
            <input
              type="time"
              className="rounded-md border border-brand-200 px-2 py-1"
              value={endTimeStr}
              disabled={!!activeSlot}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setEndTimeStr(event.target.value)}
            />
          </label>
        </div>

        <div className="rounded-md bg-brand-50 p-2 text-sm">
          {!computedStart && <p className="text-brand-700">Pick a date, start, and end time to preview conflicts.</p>}
          {previewError && <p className="text-red-700">{previewError}</p>}
          {preview && preview.ok && preview.value.remainingCapacity !== undefined && (
            <p className="text-brand-800">Remaining seats: {preview.value.remainingCapacity}</p>
          )}
          {hasConflicts && (
            <ul className="mt-1 flex flex-col gap-1">
              {conflicts.map((conflict, index) => (
                <li key={`${conflict.kind}-${conflict.start}-${index}`}>
                  <Badge tone="warning">
                    {conflict.kind} · {formatInstant(conflict.start, timeZone)} –{' '}
                    {formatInstant(conflict.end, timeZone, { timeStyle: 'short' })}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          {preview && preview.ok && !hasConflicts && <p className="text-emerald-700">No conflicts.</p>}
        </div>

        <label className="flex items-center gap-2 text-sm text-brand-900">
          <input
            type="checkbox"
            checked={overrideConflicts}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setOverrideConflicts(event.target.checked)}
          />
          Override conflicts
        </label>

        {submitResult && (
          <p className={submitResult.ok ? 'text-emerald-700' : 'text-red-700'}>{submitResult.message}</p>
        )}

        <Button type="submit" disabled={!canSubmit}>
          Book appointment
        </Button>
      </form>
    </Card>
  );
}

/** Check-then-book form: ad-hoc or slot bookings against the frozen store contract. */
export function BookingPanel() {
  const store = useCalendarStore();
  const { bookingDraft, selectedCalendarId } = store;

  // Remount the form (resetting all its local state from scratch) whenever
  // the draft, or absent a draft the shared calendar selection, changes.
  const formKey = bookingDraft
    ? `draft:${bookingDraft.calendarId}:${bookingDraft.start}:${bookingDraft.end}:${bookingDraft.slotId ?? ''}`
    : `selected:${selectedCalendarId}`;

  return <BookingForm key={formKey} />;
}
