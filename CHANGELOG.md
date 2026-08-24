# CHANGELOG

## [Unreleased]

### Added

- Initial demo release: a Vite + React + TypeScript single-page app demonstrating `@richardmcquiston01/calendar-booking-system`, seeded with a "Riverside Tutoring Center" scenario (a center calendar, two teachers on different inheritance modes across three time zones, students, recurring events, a capacity-limited group slot, and seed bookings).
- Availability and calendar-view panels backed directly by the engine's `queryAvailability`/`queryView`.
- A check-then-book booking flow with live conflict preview, a conflict-override toggle, and cancellation.
- An inheritance demo (a toggleable center-wide blocking event, and a roll-up comparison between the two teachers) plus a raw snapshot/`expandRecurrence` inspector.
- Tailwind CSS styling with a dark-green theme, AA contrast, and full keyboard accessibility.
