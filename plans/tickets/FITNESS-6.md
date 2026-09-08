# FITNESS-6: Spec: Internationalization & Offline PWA

- **State**: Todo
- **Priority**: none
- **Labels**: spec, ready-for-agent
- **Parent**: (none)
- **Blocked by**: (none)
- **Unresolved blockers**: (none)
- **Blocking**: (none)
- **Snapshot pulled**: 2026-08-22 (via VPS SSH, local sandbox network couldn't reach Plane directly)

## Description

<div><h2>Problem Statement</h2>
<p>The app needs to serve a multilingual household/user base and work as a real PWA — installable, usable offline where it matters most (the gym) — but these are cross-cutting concerns that touch every feature screen rather than living in one module, so they need explicit ownership rather than being left as an afterthought bolted onto each feature separately.</p>
<h2>Solution</h2>
<p>Ship UI chrome in four languages via next-intl, and ship a service worker that caches the offline-critical data (active programs, exercises, recent logs) and queues writes made while offline, so the app is installable and usable with no signal.</p>
<h2>User Stories</h2>
<ol>
<li>As a user, I want to choose my app language from English, Ukrainian, Russian, or Spanish, so that I can use the app comfortably in my preferred language.</li>
<li>As a user, I want my language choice to persist across sessions, so that I don't have to reselect it every time.</li>
<li>As a user, I want every button, label, and message in the app translated into my chosen language, so that the UI isn't a mix of languages.</li>
<li>As a user, I want the app to detect my browser's language on first visit as a sensible default, so that I don't have to hunt for the language switcher immediately.</li>
<li>As a user, I want to install the app to my phone's home screen, so that it behaves like a native app rather than a browser tab.</li>
<li>As a user, I want the app to load quickly even on a slow connection, thanks to caching, so that checking my plan doesn't feel sluggish.</li>
<li>As a user at the gym with no signal, I want to view my active training program(s) and the exercise catalog, so that a dead zone doesn't stop me from training.</li>
<li>As a user at the gym with no signal, I want to see my recent diary/workout entries, so that I can reference what I did last time even offline.</li>
<li>As a user at the gym with no signal, I want to log workout sets, so that the core action of training doesn't require connectivity.</li>
<li>As a user who just regained signal, I want my offline-logged sets to sync automatically without any manual action, so that going offline never means extra work later.</li>
<li>As a user, I want a visible indicator of offline/syncing/synced state, so that I trust the app isn't silently losing my data.</li>
<li>As a user, I want the app's icon, name, and splash screen to look polished when installed, so that it feels like a real app, not a bookmark.</li>
<li>As a user on any device (mobile, tablet, desktop, laptop), I want the layout to adapt appropriately, so that the app is usable regardless of screen size.</li>
</ol>
<h2>Implementation Decisions</h2>
<ul>
<li><strong>i18n</strong>: next-intl covering UI chrome only (labels, buttons, navigation, static copy) across <code>en</code>/<code>uk</code>/<code>ru</code>/<code>es</code>. Locale is part of the route (<code>[locale]/...</code> per the frontend structure in the grooming note). Food/exercise <strong>content</strong> names are a separate concern owned by Spec: Diet Engine and Spec: Training (their own translations tables) — this spec covers the app shell only.</li>
<li><strong>PWA</strong>: a standard web app manifest (icons, name, theme color, display: standalone) plus a service worker registered by the Next.js app.</li>
<li><strong>Offline caching scope</strong>: active Training Programs, the Exercise catalog, and recent Daily Log/Workout Log entries — matches the grooming note's explicit offline requirement list, not a blanket cache of the whole app.</li>
<li><strong>Offline writes</strong>: workout-set logging queues in IndexedDB while offline; the service worker flushes the queue to the NestJS API in submission order once connectivity returns. No conflict resolution needed since Workout Sets are append-only (see <code>knowledge/business-rules.md</code> "PWA offline supports queued writes"). This mechanism is implemented once, here, and consumed by Spec: Training rather than re-implemented per feature.</li>
<li>Responsive layout uses Tailwind's standard breakpoint system across the existing ShadCN component set — no new design-system dependency.</li>
</ul>
<h2>Testing Decisions</h2>
<ul>
<li><strong>Next.js seam</strong>: Playwright E2E is the primary seam for this spec specifically, since offline behavior and PWA installability are inherently browser-level concerns that can't be meaningfully proven at an API seam:</li>
<li>Switch language and confirm chrome strings change (spot-check a few screens, not every string).</li>
<li>Simulate offline (Playwright network conditions): confirm cached program/exercise/recent-log views still render, confirm a queued workout-set write appears server-side once back online.</li>
<li>Lighthouse/PWA-installability check (manifest present, service worker registered) as a CI-run assertion rather than a manual audit.</li>
<li>No NestJS-seam-specific tests for this spec — the API endpoints being cached/queued against are already tested by the specs that own them (Training).</li>
</ul>
<h2>Out of Scope</h2>
<ul>
<li>Full offline support for Diet generation or Photo upload/analysis (both require live backend computation/external services; only Training's read+queued-write pattern is in scope per the grooming note's explicit list).</li>
<li>Translating user-generated or imported content names (food/exercise catalog) — owned by their respective specs.</li>
<li>Push notifications.</li>
<li>Additional languages beyond the four specified.</li>
</ul>
<h2>Further Notes</h2>
<p>This spec's service-worker/IndexedDB queue mechanism is a dependency of Spec: Training's offline user stories — build the shared offline infrastructure here, then wire Training's workout-set logging into it. i18n has no hard dependency on other specs but should land early since it touches every screen other specs build.</p></div>
