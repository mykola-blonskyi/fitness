# FITNESS-22: Photo upload pipeline

- **State**: Backlog
- **Priority**: high
- **Labels**: ready-for-agent
- **Parent**: FITNESS-4
- **Blocked by**: FITNESS-10, FITNESS-14
- **Unresolved blockers**: (none)
- **Blocking**: FITNESS-23
- **Snapshot pulled**: 2026-08-22 (via VPS SSH, local sandbox network couldn't reach Plane directly)

## Description

<div><h2>Parent</h2><p>FITNESS-4 — Spec: Progress Photos &amp; Pose Analysis</p><h2>What to build</h2><p>Presigned upload to a private MinIO bucket, Photo Session/Progress Photo records, baseline flag, and presigned reads.</p><h2>Acceptance criteria</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>A user can request a presigned upload URL and upload front/side/back photos directly to MinIO</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Confirming the upload creates a Photo Session and its Progress Photo rows, linked to the current Daily Log</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>A user can mark a session as baseline; attempting to mark a second session baseline is rejected by the database constraint</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Viewing a photo generates a short-lived presigned GET URL after verifying the requester owns it; no permanent public URL is ever returned</p></div></li></ul><h2>Blocked by</h2><p>#8 Daily Log + weight logging, #4 User profile creation &amp; completion gate</p></div>
