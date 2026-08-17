# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repository is a placeholder / not yet scaffolded. It currently contains only `README.md`, `CHANGELOG.md`, `LICENSE`, and `donate.svg` — there is no `package.json`, source code, build tooling, or test suite yet.

There are no build, lint, or test commands to document until the project is scaffolded.

## Purpose

Per `README.md`, this is intended to be a TypeScript-based demo for the `@richardmcquiston01/calendar-booking-system` package. Treat the README's "Getting Started" section (Prerequisites / Installation / Usage / Examples) as unfilled placeholders — do not assume functionality that isn't implemented.

## Working in this repo

- When scaffolding the project for the first time, confirm the intended stack/tooling with the user (per the user's global CLAUDE.md, default to `bun` unless told otherwise) rather than assuming.
- Update `README.md` and `CHANGELOG.md` as real structure and features are added — both are currently stubs.
- Re-run `/init` (or otherwise regenerate this file) once real source code, build tooling, and tests exist, so this file reflects actual architecture instead of a placeholder state.
