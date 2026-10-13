# CHANGELOG

## [Unreleased]

### Changed

- Upgraded `@richardmcquiston01/calendar-booking-system` from `^0.2.0` to `^0.3.0`. 0.3.0 is an internal performance release (one shared snapshot index per call, no repeated validation) with no behavior or public signature change, so no demo code changed. Typecheck, lint, tests, and build pass.
- Upgraded `@richardmcquiston01/calendar-booking-system` from `^0.1.0` to `^0.2.0`. The seeded scenario already used canonical UTC instants and plain weekly `byDay` rules, so it validates unchanged under the engine's stricter rules (canonical instants, recurrence caps, rule `startDate`). Typecheck, lint, tests, and build pass.

### Added

- Initial demo release: a Vite + React + TypeScript single-page app demonstrating `@richardmcquiston01/calendar-booking-system`, seeded with a "Riverside Tutoring Center" scenario (a center calendar, two teachers on different inheritance modes across three time zones, students, recurring events, a capacity-limited group slot, and seed bookings).
- Availability and calendar-view panels backed directly by the engine's `queryAvailability`/`queryView`.
- A check-then-book booking flow with live conflict preview, a conflict-override toggle, and cancellation.
- An inheritance demo (a toggleable center-wide blocking event, and a roll-up comparison between the two teachers) plus a raw snapshot/`expandRecurrence` inspector.
- Tailwind CSS styling with a dark-green theme, AA contrast, and full keyboard accessibility.
