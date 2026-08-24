# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

A working demo: a Vite + React + TypeScript single-page app for `@richardmcquiston01/calendar-booking-system`. Package manager is `bun`. See `PLAN.md` for the original build plan (scaffold → parallel feature panels → integration) and the "Riverside Tutoring Center" demo scenario it implements.

## Commands

```sh
bun install
bun run dev        # Vite dev server
bun run build      # tsc -b (project references) + vite build
bun run preview    # serve the production build
bun run typecheck  # tsc -b --noEmit
bun run lint       # eslint . (flat config, typescript-eslint + react-hooks + react-refresh)
bun run test       # vitest run
```

## Architecture

- **`src/store/`** — the app's only state layer, no external state library.
  - `seed.ts` — builds the demo `CalendarSnapshot` and a `DemoDirectory` of every seeded id, computed relative to `now` (via `getDemoWeekStart`) so the deployed demo never goes stale.
  - `store.ts` — `useCalendarStore()`, a `useSyncExternalStore` singleton wrapping the engine's `check*`/`apply*`/`cancelBooking`/`deleteEvent` calls. Also exports the underlying action functions directly (`bookAppointment`, `cancelBooking`, etc.) and `getCalendarStoreState()` for non-React use (tests).
  - `timezone.ts` — zoned-time conversion built on `Intl.DateTimeFormat`. **Important**: the engine's own `time.ts` helpers (`zonedInstant`, `civilDateInZone`, `nowInstant`, ...) are not re-exported from its public entry point (`@richardmcquiston01/calendar-booking-system`'s `package.json` `exports` map only exposes `dist/index.js`) — don't assume they're importable; this file reimplements what's needed.
  - `index.ts` — the barrel every feature imports through.
- **`src/ui/`** — shared presentational primitives (`Badge`, `Card`, `Button`) used by every feature panel.
- **`src/features/{availability,booking,inheritance}/`** — the panels, each depending only on `src/store`, `src/ui`, and the engine package directly (never on a sibling feature directory).
- **`src/App.tsx`** — the only file wiring features together into the page layout.

## Working in this repo

- Before using an engine (`@richardmcquiston01/calendar-booking-system`) function you haven't used before, check its `.d.ts` files in `node_modules/@richardmcquiston01/calendar-booking-system/dist/` — its public surface is narrower than the source `.ts` files suggest (see the timezone note above), and `ApplySuccess<T>` uses a `record` field, not `value`.
- Keep `src/features/**` subdirectories decoupled from each other; shared code belongs in `src/store` or `src/ui`.
- `tsconfig.app.json` has `verbatimModuleSyntax: true` — use `import type` for type-only imports.
- Update `README.md` and `CHANGELOG.md` when adding real features.
