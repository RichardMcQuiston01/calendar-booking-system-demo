# Plan: Calendar Booking System — Demo Site

## Context

`calendar-booking-system-demo` currently has no source code (just README/CHANGELOG/LICENSE/CLAUDE.md). The goal is to build a simple, static demo site that showcases the core functionality of `@richardmcquiston01/calendar-booking-system` (npm v0.1.0, source: github.com/RichardMcQuiston01/calendar-booking-system-ts) — a framework-agnostic, **zero-dependency, ESM-only, pure TypeScript** scheduling/booking engine. It has no I/O, UI, or database: every call takes an immutable `CalendarSnapshot` and returns a `Result<T>` plus (for mutations) a brand-new snapshot.

Domain model: **entities** (tree via `parentId`) optionally link 1:1 to a **calendar** via `EntityCalendar`. Calendars mirror the entity tree and each has an `inheritance` mode: `none` | `inherit-blocks` | `roll-up` | `both`. A `CalendarSnapshot` holds 7 arrays: `entities, calendars, entityCalendars, events, availabilityRules, slots, bookings`. The engine follows a **check-then-apply** pattern: `check*` functions always return conflicts (never fail on conflict); `apply*` functions refuse to commit on conflict unless `opts.allowConflicts: true`.

This plan will be written to `PLAN.md` in the repo, then executed by multiple subagents — most of it in parallel — after user approval. The user confirmed: static single-page demo, React + TypeScript + Vite, deployed to Vercel, bun as package manager, vitest included for the data layer, one shared calendar picker (not per-panel), and a 3-phase execution structure (not fully flat parallelism) since the UI agents depend on a shared store contract existing first.

**Correction from research**: `ApplySuccess<T>` has fields `{ snapshot, record }` — NOT `{ snapshot, value }`. All code must use `result.value.record`, not `result.value.value`.

## Demo scenario: "Riverside Tutoring Center"

```
Center (entity, root)         tz: America/Chicago     inheritance: none
├── Ada Lin (teacher)         tz: America/New_York    inheritance: both            (inherits blocks + rolls up)
└── Sam Osei (teacher)        tz: America/Los_Angeles inheritance: inherit-blocks  (blocks only, no roll-up)

Students (no calendar link): Priya Shah, Marcus Webb
```

Using two different inheritance modes on the two teachers lets one toggle (a center-wide blocking event) visibly shrink both teachers' availability identically, while a roll-up comparison shows Ada's events appearing on the Center's view and Sam's never appearing — a concrete, side-by-side contrast.

- **Availability rules**: Ada Mon–Fri 08:00–15:00 (local); Sam Mon–Fri 09:00–17:00 (local).
- **Recurring events**: Ada "Staff Meeting" (weekly Wed 12:00–12:30, with one excluded occurrence 3 weeks out); Sam "Reading Circle" (weekly Thu 11:00–11:30).
- **Center blocking event**: "Professional Development Day" — one-off, full civil day Friday in `America/Chicago`, exclusive. Toggleable in the UI; demonstrates `inherit-blocks` propagation.
- **Group slot**: Ada's calendar, Tue 10:00–11:00, capacity 3 (Marcus pre-seated, 2 seats open).
- **Seed bookings**: Priya ad-hoc on Ada Tue 09:30–10:00; Marcus in the group slot; Priya ad-hoc on Sam Thu 14:00–14:30.
- **Dates are computed relative to "now"** at load time (`getDemoWeekStart()` finds the next Monday), not hardcoded, so the deployed demo never goes stale.

This exercises: hierarchy setup, availability rules across 3 IANA zones, recurring events + exclusion, a capacity slot with live remaining-seat count, ad-hoc + seat bookings, check-then-apply with visible conflict override, cancellation, and both inheritance modes.

## Architecture & execution phases

```
Phase 1 (sequential)        Phase 2 (3 parallel agents)              Phase 3 (sequential)
┌────────────────────┐      ┌─────────────┬─────────────┬──────────┐  ┌──────────────────┐
│ Workstream A:       │ ──▶  │ B:          │ C:          │ D:       │─▶│ Integration:      │
│ Scaffold + store    │      │ Availability│ Booking     │Inheritance│  │ App.tsx wiring,   │
│ (the contract)      │      │ + view UI   │ flow UI     │+ inspector│  │ styling, verify,  │
└────────────────────┘      └─────────────┴─────────────┴──────────┘  │ deploy            │
                                                                        └──────────────────┘
```

B, C, D each import **only** from `src/store/**`, `src/ui/**` (Workstream A's output), and the npm engine package directly for read-only queries. They never import from each other's `src/features/**` directories. The single calendar picker lives in Workstream B; C and D just read `selectedCalendarId` reactively from the store.

## Workstream A — Scaffold + shared contract (Phase 1)

Tooling: Vite + React + TypeScript, Tailwind CSS (dark-green accent, WCAG AA), ESLint flat config, vitest. `package.json` depends on `@richardmcquiston01/calendar-booking-system@^0.1.0`. `vercel.json` for zero-config Vite deploy (`bun run build` / `bun install` / `outputDirectory: dist`).

Key files (exact exported contract — Phase 2 agents code against this):

- `src/store/ids.ts` — `createId(): Uuid` (via `crypto.randomUUID()`).
- `src/store/timezone.ts` — `zonedTimeToInstant(date, time, timeZone): Instant`, `formatInstant(instant, timeZone, opts?): string`, `toDateOnly(instant, timeZone): DateOnly`.
- `src/store/seed.ts` — `getDemoWeekStart(reference?: Date): DateOnly`, `buildSeed(now?: Instant): SeedResult` where `SeedResult = { snapshot: CalendarSnapshot; directory: DemoDirectory }`. `DemoDirectory` carries every seeded ID (center/teachers/students/slot/blocking event/bookings) plus each teacher's `timeZone` and `rollsUp: boolean`. Built via sequential `putEntity → putCalendar → putEntityCalendar → applyAvailabilityRule → applyEvent → applySlot → applyBooking`, throwing on any `!result.ok` (seed bugs fail loudly).
- `src/store/store.ts` — `useCalendarStore(): CalendarStore` (singleton + `useSyncExternalStore`, **no external state library**). State: `snapshot, directory, selectedCalendarId, selectedRange, bookingDraft, isBlockingEventActive, lastAction`. Actions: `selectCalendar`, `setSelectedRange`, `setBookingDraft`, `previewBooking` (wraps `checkBooking`), `bookAppointment(input, allowConflicts?)` (wraps `applyBooking`), `cancelBooking`, `toggleCenterBlockingEvent(active)` (wraps `applyEvent`/`deleteEvent`), `resetToSeed()`.
- `src/store/index.ts` — barrel re-exporting all of the above; this is the one import path B/C/D use.
- `src/ui/Badge.tsx`, `src/ui/Card.tsx`, `src/ui/Button.tsx` — shared presentational primitives so B/C/D stay visually consistent without depending on each other. `Badge` supports tones `own | inherited | rolled-up | neutral | success | danger | warning`.

**Verification (must pass before Phase 2 starts)**: `bun install && bun run typecheck && bun run lint` clean; `bun test` on `src/store/seed.test.ts` + `src/store/store.test.ts` covering: `validateSnapshot(buildSeed().snapshot).ok === true`; every directory ID resolves to a real row; `queryAvailability` returns non-empty intervals; `bookAppointment` happy-path + conflict-rejection + `cancelBooking` + `toggleCenterBlockingEvent` round-trip + `resetToSeed()` all behave correctly. Manual: `bun run dev` renders a blank shell with no console errors.

## Workstream B — Availability + View UI (Phase 2, parallel)

`src/features/availability/AvailabilityPanel.tsx` — the **one** calendar picker (Center/Ada/Sam) bound to `selectCalendar`, prev/next-week controls bound to `setSelectedRange`, calls `queryAvailability` directly from the engine and renders open intervals as clickable "Book this slot" buttons (→ `setBookingDraft`).

`src/features/availability/CalendarViewPanel.tsx` — calls `queryView` directly, renders each `ViewItem` in a `Card` with `<Badge tone={item.source}>`.

Depends only on `src/store`, `src/ui`, and the engine's `queryAvailability`/`queryView`.

## Workstream C — Booking flow UI (Phase 2, parallel)

`src/features/booking/BookingPanel.tsx` — check-then-book form, prefilled from `bookingDraft` when set. Supports ad-hoc and slot bookings (slot mode auto-fills `start`/`end` to the slot's exact bounds — required by the engine). Debounced `previewBooking` renders live conflicts + remaining capacity. An "Override conflicts" checkbox (unchecked by default) gates `bookAppointment(input, true)` — the visible `allowConflicts` demonstration. Success/failure surfaced from the `Result`.

`src/features/booking/BookingsList.tsx` — lists bookings on the selected calendar with a Cancel action (`cancelBooking`).

Depends only on `src/store`, `src/ui`, and engine `Result`/`Booking` types.

## Workstream D — Inheritance demo + inspector (Phase 2, parallel)

`src/features/inheritance/InheritancePanel.tsx` — Section 1: toggle bound to `isBlockingEventActive`/`toggleCenterBlockingEvent`, showing both teachers' Friday availability before/after. Section 2: static roll-up comparison via `queryView` on the Center calendar, partitioned by teacher, contrasting Ada (`rollsUp: true`, items appear) vs Sam (`rollsUp: false`, items don't).

`src/features/inheritance/SnapshotInspector.tsx` — collapsible raw JSON of `snapshot` and `lastAction`, plus `expandRecurrence` output for each teacher's recurring event (the one place this engine function is exercised directly).

Depends only on `src/store`, `src/ui`, and engine `queryView`/`queryAvailability`/`effectiveExclusiveBusy`/`expandRecurrence`.

## Phase 3 — Final integration (sequential)

- `src/App.tsx` — header (title, demo week, "Reset demo" button) + responsive grid wiring `AvailabilityPanel`+`CalendarViewPanel` | `BookingPanel`+`BookingsList` | `InheritancePanel`+`SnapshotInspector`.
- `src/main.tsx` — standard React root render.
- Styling/accessibility pass: AA contrast on brand + badge tones, visible focus rings, full keyboard click-through.
- Update `README.md` (Getting Started: bun install/dev/build), `CHANGELOG.md` (Added: initial demo release), and refresh `CLAUDE.md` once real code/tooling exist.

## Verification (Phase 3 gate — end to end)

1. `bun install && bun run typecheck && bun run lint && bun test` — all clean/green (typecheck alone proves B/C/D actually matched A's contract).
2. `bun run build` — production build succeeds, `dist/` populated.
3. `bun run preview` + manual (or MCP browser tool) click-through:
   - Default view (Ada) shows gaps around the seeded booking and Staff Meeting, Friday closed (blocking event active).
   - Click open slot → book with Priya → appears in BookingsList.
   - Book directly over Staff Meeting → conflict shown, Book disabled until override checked → force-book → cancel → clean state.
   - Book into group slot until capacity-full conflict appears.
   - Switch to Sam's calendar → independent rules confirmed.
   - Toggle blocking event off/on → Friday reopens/closes for both teachers.
   - Roll-up comparison: Ada's event appears on Center's rolled-up view, Sam's never does.
   - SnapshotInspector JSON updates live; `expandRecurrence` lists populate for both teachers.
4. Deploy a Vercel preview to confirm the zero-config build works on Vercel infrastructure, not just locally (requires user confirmation before actually deploying).

## Critical files

- `package.json` — pins the engine dependency, scripts, dev toolchain everything else assumes.
- `src/store/store.ts` — the stateful contract B/C/D all build against.
- `src/store/seed.ts` — encodes the entire demo scenario every panel visualizes.
- `src/store/timezone.ts` — zoned-time conversion/formatting used everywhere an `Instant` is shown or built.
- `src/App.tsx` — the only file importing across B/C/D; the one place the "no sideways dependency" rule could be violated if written carelessly.
