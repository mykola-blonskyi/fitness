# FITNESS-11: next-intl UI chrome

- **State**: Todo
- **Priority**: medium
- **Labels**: ready-for-agent
- **Parent**: FITNESS-6
- **Blocked by**: FITNESS-7
- **Unresolved blockers**: (none)
- **Blocking**: (none)
- **Snapshot pulled**: 2026-08-22 (via VPS SSH, local sandbox network couldn't reach Plane directly)

## Description

<div><h2>Parent</h2><p>FITNESS-6 — Spec: Internationalization &amp; Offline PWA</p><h2>What to build</h2><p>Add locale routing and translated UI chrome for English, Ukrainian, Russian, and Spanish.</p><h2>Acceptance criteria</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>The app renders in English, Ukrainian, Russian, and Spanish via a language switcher</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Locale choice persists across sessions</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>First visit defaults to the browser's language when supported, else English</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Locale is part of the route structure ([locale]/...)</p></div></li></ul><h2>Blocked by</h2><p>#1 App scaffolding + Drizzle/Postgres wiring</p></div>
