# FITNESS-24: Real pose/alignment analysis + retry semantics + retry UI

- **State**: Backlog
- **Priority**: high
- **Labels**: ready-for-agent
- **Parent**: FITNESS-4
- **Blocked by**: FITNESS-23
- **Unresolved blockers**: FITNESS-23
- **Blocking**: FITNESS-25
- **Snapshot pulled**: 2026-08-22 (via VPS SSH, local sandbox network couldn't reach Plane directly)

## Description

<div><h2>Parent</h2><p>FITNESS-4 — Spec: Progress Photos &amp; Pose Analysis</p><h2>What to build</h2><p>Replace the stub with real MediaPipe pose/alignment/landmark analysis, add auto-retry-then-fail, and surface failure/retry to the user.</p><h2>Acceptance criteria</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>The worker's stub is replaced with real MediaPipe pose detection, alignment validation, and landmark extraction</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>A transient failure is retried automatically a few times with backoff before the job is marked failed permanently</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>The UI shows processing/completed/failed status and offers a manual retry action that re-enqueues the job</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Landmarks and alignment data are persisted and retrievable for a completed analysis</p></div></li></ul><h2>Blocked by</h2><p>#17 Photo-analysis queue plumbing + worker skeleton (stub)</p></div>
