---
id: FITNESS-11
title: "next-intl UI chrome"
state: Done
state_group: completed
priority: medium
labels: [ready-for-agent]
module: "Internationalization & Offline PWA"
parent: FITNESS-6
created: 2026-08-15
updated: 2026-08-25
plane_id: 198ef7c1-897b-4d12-89c6-a2e52d019b0c
---

# FITNESS-11: next-intl UI chrome

### Parent

FITNESS-6 — Spec: Internationalization & Offline PWA

### What to build

Add locale routing and translated UI chrome for English, Ukrainian, Russian, and Spanish.

### Acceptance criteria

- [x] The app renders in English, Ukrainian, Russian, and Spanish via a language switcher
- [x] Locale choice persists across sessions
- [x] First visit defaults to the browser's language when supported, else English
- [x] Locale is part of the route structure ([locale]/...)

### Blocked by

#1 App scaffolding + Drizzle/Postgres wiring
