# FITNESS-19: Multiple concurrent active programs

- **State**: Todo
- **Priority**: medium
- **Labels**: ready-for-agent
- **Parent**: FITNESS-2
- **Blocked by**: FITNESS-18
- **Unresolved blockers**: FITNESS-18
- **Blocking**: FITNESS-20
- **Snapshot pulled**: 2026-08-22 (via VPS SSH, local sandbox network couldn't reach Plane directly)

## Description

<div><h2>Parent</h2><p>FITNESS-2 — Spec: Training Programs &amp; Workout Tracking</p><h2>What to build</h2><p>Let a user activate more than one Training Program at once, per ADR-004's correction of the one-to-one schema.</p><h2>Acceptance criteria</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>A user can activate more than one Training Program at the same time</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>The active-programs list shows all currently active programs, not just one</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Deactivating one active program does not affect the others</p></div></li></ul><h2>Blocked by</h2><p>#12 Training Program builder</p></div>
