# FITNESS-23: Photo-analysis queue plumbing + worker skeleton (stub)

- **State**: Backlog
- **Priority**: high
- **Labels**: ready-for-agent
- **Parent**: FITNESS-4
- **Blocked by**: FITNESS-22
- **Unresolved blockers**: FITNESS-22
- **Blocking**: FITNESS-24
- **Snapshot pulled**: 2026-08-22 (via VPS SSH, local sandbox network couldn't reach Plane directly)

## Description

<div><h2>Parent</h2><p>FITNESS-4 — Spec: Progress Photos &amp; Pose Analysis</p><h2>What to build</h2><p>Get the end-to-end pipe working per ADR-003 (plain Redis list/stream, not BullMQ) between NestJS and a Python worker skeleton, with a stub analysis result, before adding real CV logic.</p><h2>Acceptance criteria</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Confirming a photo upload pushes a JSON job onto the Redis queue in the agreed payload shape</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>The Python worker consumes the job, reads the object from MinIO with its own credentials, and writes a stub result back</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>progress_photos.analysis_status transitions pending -&gt; processing -&gt; completed (or failed) end to end through the real queue, even though the analysis itself is a stub</p></div></li></ul><h2>Blocked by</h2><p>#16 Photo upload pipeline</p></div>
