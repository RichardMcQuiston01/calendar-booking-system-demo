import type { ClockTime, DateOnly, Instant, TimeZone } from '@richardmcquiston01/calendar-booking-system';

/**
 * The engine's own zoned-time helpers (`zonedInstant`, `civilDateInZone`,
 * `nowInstant`, ...) live in its `time.ts` module but are not re-exported
 * from the package's public entry point, so this file re-implements the
 * conversions the store needs on top of `Intl.DateTimeFormat`.
 */

function timeZoneOffsetMs(epochMs: number, timeZone: TimeZone): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(epochMs));

  const value = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    value('year'),
    value('month') - 1,
    value('day'),
    value('hour'),
    value('minute'),
    value('second'),
  );
  return asUtc - epochMs;
}

/**
 * UTC instant for a civil date + clock time in `timeZone`, resolved by
 * guessing the offset from a naive UTC interpretation and correcting for
 * it — one correction pass is enough outside of a DST transition itself.
 */
export function zonedTimeToInstant(date: DateOnly, time: ClockTime, timeZone: TimeZone): Instant {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const naiveUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0);

  const firstOffset = timeZoneOffsetMs(naiveUtcMs, timeZone);
  const correctedMs = naiveUtcMs - firstOffset;
  const secondOffset = timeZoneOffsetMs(correctedMs, timeZone);
  const instantMs = secondOffset === firstOffset ? correctedMs : naiveUtcMs - secondOffset;

  return new Date(instantMs).toISOString();
}

/** Civil `YYYY-MM-DD` of `instant` in `timeZone`. */
export function toDateOnly(instant: Instant, timeZone: TimeZone): DateOnly {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(instant));
}

/** Human-readable rendering of `instant` in `timeZone`, for display in the UI. */
export function formatInstant(
  instant: Instant,
  timeZone: TimeZone,
  opts?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
    ...opts,
  }).format(new Date(instant));
}

/** Current time as a normalized UTC instant string. */
export function nowInstant(): Instant {
  return new Date().toISOString();
}
