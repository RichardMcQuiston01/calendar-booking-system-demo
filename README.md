# calendar-booking-system-demo

## Overview

A live, interactive demo of [`@richardmcquiston01/calendar-booking-system`](https://github.com/RichardMcQuiston01/calendar-booking-system-ts) — a framework-agnostic, zero-dependency, ESM-only TypeScript scheduling/booking engine. This is a single-page React app (no backend) that seeds an in-memory scenario and drives every panel through the engine's own `check*`/`apply*`/`query*` functions.

**Scenario: "Riverside Tutoring Center"** — a center calendar with two teachers on different inheritance modes (Ada Lin: `both`, in `America/New_York`; Sam Osei: `inherit-blocks`, in `America/Los_Angeles`) across three IANA time zones. It demonstrates:

- Availability rules, recurring events (with an excluded occurrence), and a capacity-limited group slot with a live remaining-seat count
- Check-then-apply booking with a visible conflict/override flow, and cancellation
- A center-wide blocking event that propagates to both teachers identically via `inherit-blocks`, while only Ada's calendar (`both`) rolls its own events up to the Center's view
- The engine's raw `CalendarSnapshot` and `expandRecurrence` output, inspectable live

The demo week is always computed relative to "now" at load time, so the deployed site never goes stale.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) 1.x

### Installation

```sh
bun install
```

### Usage

```sh
bun run dev        # start the Vite dev server
bun run build      # type-check and build the production bundle to dist/
bun run preview    # serve the production build locally
bun run typecheck   # tsc project-references check, no emit
bun run lint        # eslint
bun run test        # vitest
```

### Examples

Open the dev server and:

1. Book an open interval on Ada's calendar, or add Priya/Marcus into her Tuesday group slot until it's full.
2. Try booking directly over Ada's Wednesday Staff Meeting — the conflict is shown and booking is blocked until you check "Override conflicts".
3. Toggle the Center's "Professional Development Day" event off and on to see both teachers' Friday availability open and close together.
4. Compare the roll-up panel: Ada's Staff Meeting appears on the Center's view; Sam's Reading Circle never does.

## Buy Me a Coffee

I developed this while I currently looking for work. If this app has helped you or someone you know, please consider donating. I appreciate it.

[**Donate via Stripe**](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800), or scan:

[![Donate via Stripe](./donate.svg)](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800)

## License

Apache 2

## Copyright

(c)2026 Richard McQuiston.  All rights reserved.
