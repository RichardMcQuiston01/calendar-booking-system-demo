import type { Uuid } from '@richardmcquiston01/calendar-booking-system';

/** Generate a fresh row id for engine inputs (`put*`/`apply*` never assign one). */
export function createId(): Uuid {
  return crypto.randomUUID();
}
