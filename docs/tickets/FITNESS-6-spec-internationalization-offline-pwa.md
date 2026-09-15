---
id: FITNESS-6
title: "Spec: Internationalization & Offline PWA"
state: Done
state_group: completed
priority: none
labels: [spec, ready-for-agent]
module: "Internationalization & Offline PWA"
parent: null
created: 2026-08-15
updated: 2026-09-03
plane_id: c8b3f1ff-3237-4736-b463-07d7574097f5
---

# FITNESS-6: Spec: Internationalization & Offline PWA

### Problem Statement

The app needs to serve a multilingual household/user base and work as a real PWA — installable, usable offline where it matters most (the gym) — but these are cross-cutting concerns that touch every feature screen rather than living in one module, so they need explicit ownership rather than being left as an afterthought bolted onto each feature separately.

### Solution

Ship UI chrome in four languages via next-intl, and ship a service worker that caches the offline-critical data (active programs, exercises, recent logs) and queues writes made while offline, so the app is installable and usable with no signal.

### User Stories

1. As a user, I want to choose my app language from English, Ukrainian, Russian, or Spanish, so that I can use the app comfortably in my preferred language.
2. As a user, I want my language choice to persist across sessions, so that I don't have to reselect it every time.
3. As a user, I want every button, label, and message in the app translated into my chosen language, so that the UI isn't a mix of languages.
4. As a user, I want the app to detect my browser's language on first visit as a sensible default, so that I don't have to hunt for the language switcher immediately.
5. As a user, I want to install the app to my phone's home screen, so that it behaves like a native app rather than a browser tab.
6. As a user, I want the app to load quickly even on a slow connection, thanks to caching, so that checking my plan doesn't feel sluggish.
7. As a user at the gym with no signal, I want to view my active training program(s) and the exercise catalog, so that a dead zone doesn't stop me from training.
8. As a user at the gym with no signal, I want to see my recent diary/workout entries, so that I can reference what I did last time even offline.
9. As a user at the gym with no signal, I want to log workout sets, so that the core action of training doesn't require connectivity.

10. As a user who just regained signal, I want my offline-logged sets to sync automatically without any manual action, so that going offline never means extra work later.

11. As a user, I want a visible indicator of offline/syncing/synced state, so that I trust the app isn't silently losing my data.

12. As a user, I want the app's icon, name, and splash screen to look polished when installed, so that it feels like a real app, not a bookmark.

13. As a user on any device (mobile, tablet, desktop, laptop), I want the layout to adapt appropriately, so that the app is usable regardless of screen size.

### Implementation Decisions

- **i18n**: next-intl covering UI chrome only (labels, buttons, navigation, static copy) across `en`/`uk`/`ru`/`es`. Locale is part of the route (`[locale]/...` per the frontend structure in the grooming note). Food/exercise **content** names are a separate concern owned by Spec: Diet Engine and Spec: Training (their own translations tables) — this spec covers the app shell only.
- **PWA**: a standard web app manifest (icons, name, theme color, display: standalone) plus a service worker registered by the Next.js app.
- **Offline caching scope**: active Training Programs, the Exercise catalog, and recent Daily Log/Workout Log entries — matches the grooming note's explicit offline requirement list, not a blanket cache of the whole app.
- **Offline writes**: workout-set logging queues in IndexedDB while offline; the service worker flushes the queue to the NestJS API in submission order once connectivity returns. No conflict resolution needed since Workout Sets are append-only (see `knowledge/business-rules.md` "PWA offline supports queued writes"). This mechanism is implemented once, here, and consumed by Spec: Training rather than re-implemented per feature.
- Responsive layout uses Tailwind's standard breakpoint system across the existing ShadCN component set — no new design-system dependency.

### Testing Decisions

- **Next.js seam**: Playwright E2E is the primary seam for this spec specifically, since offline behavior and PWA installability are inherently browser-level concerns that can't be meaningfully proven at an API seam:
- Switch language and confirm chrome strings change (spot-check a few screens, not every string).
- Simulate offline (Playwright network conditions): confirm cached program/exercise/recent-log views still render, confirm a queued workout-set write appears server-side once back online.
- Lighthouse/PWA-installability check (manifest present, service worker registered) as a CI-run assertion rather than a manual audit.
- No NestJS-seam-specific tests for this spec — the API endpoints being cached/queued against are already tested by the specs that own them (Training).

### Out of Scope

- Full offline support for Diet generation or Photo upload/analysis (both require live backend computation/external services; only Training's read+queued-write pattern is in scope per the grooming note's explicit list).
- Translating user-generated or imported content names (food/exercise catalog) — owned by their respective specs.
- Push notifications.
- Additional languages beyond the four specified.

### Further Notes

This spec's service-worker/IndexedDB queue mechanism is a dependency of Spec: Training's offline user stories — build the shared offline infrastructure here, then wire Training's workout-set logging into it. i18n has no hard dependency on other specs but should land early since it touches every screen other specs build.
