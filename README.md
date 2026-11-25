# Interval Bell — Pause. Refocus. Continue.

Interval Bell is an offline-first, nature-inspired interval reminder and focus application built with React, TypeScript, Tailwind CSS, Zustand, Zod, IndexedDB, Web Audio API, and Progressive Web App (PWA) caching.

## Architecture

- `src/engines/session-engine/`: Pure TypeScript session lifecycle, exact reminder scheduling anchored to active focus elapsed time, pause/resume preservation, reopen restoration, and monotonic clock-jump recovery.
- `src/engines/reminder-engine/`: Independent alert state machine (`WAITING` -> `ALERT_ACTIVE` -> `WAITING` / `SNOOZED`).
- `src/engines/audio-engine/`: Single-instance Web Audio API synthesizer generating 10 original offline sounds (`Bell`, `Nature`, `Ambient`, `Minimal`) with zero overlapping players and immediate stop-on-dismiss.
- `src/services/storage/`: Local IndexedDB persistence for session history and saved presets, plus `localStorage` persistence for user preferences and active session checkpoints.
- `src/platform/`: Platform adapter abstraction (`WebPlatformAdapter`, `AndroidPlatformBridge`, `DesktopPlatformBridge`) separating UI/session rules from OS-specific notification, vibration, and background execution capabilities.

## Clock Discrepancy Recovery Policy

While a session is active, `SessionEngine` compares wall-clock progression (`Date.now()`) against monotonic runtime progression (`performance.now()`). If a jump greater than 5 seconds or a backward shift is detected, elapsed focus time is preserved using monotonic time and wall-clock anchors are automatically rebased without corrupting the countdown or reminder schedule.

## Scripts

- `npm run dev` — Run development server with PWA service worker enabled
- `npm run build` — Production Web + PWA bundle
- `npm run lint` — TypeScript typecheck (`tsc --noEmit`)
- `npm test` — Run automated Vitest suite for session and reminder engines
