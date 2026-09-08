# FITNESS-21: Offline workout logging

- **State**: Todo
- **Priority**: medium
- **Labels**: ready-for-agent
- **Parent**: FITNESS-2
- **Blocked by**: FITNESS-13, FITNESS-20
- **Unresolved blockers**: FITNESS-13, FITNESS-20
- **Blocking**: (none)
- **Snapshot pulled**: 2026-08-22 (via VPS SSH, local sandbox network couldn't reach Plane directly)

## Description

<h2 class="editor-heading-block" data-id="e97574e7-74cc-40db-8d74-ca6587b8f90e">Parent</h2><p class="editor-paragraph-block" data-id="62d1449f-3e4b-4794-8efd-5ce1d585683d">FITNESS-2 — Spec: Training Programs &amp; Workout Tracking</p><h2 class="editor-heading-block" data-id="e4b7cfe7-e316-4100-95cc-1056e15de3a4">What to build</h2><p class="editor-paragraph-block" data-id="05ca99d3-3d8c-4cdc-9067-63e6b5cdd71b">Wire workout-set logging into the offline write-queue so a set can be logged at the gym with no signal.</p><h2 class="editor-heading-block" data-id="91f99146-97d0-493a-ad9c-b838b62cb8c4">Acceptance criteria</h2><ul class="not-prose pl-2 space-y-2" data-id="3ca41093-37e0-4301-a8bb-0fd81eb25971" data-type="taskList"><li class="relative" data-id="859e2ad2-bf92-42cd-9586-332bf63b0c1f" data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p class="editor-paragraph-block" data-id="2c66dfc7-4e3a-4437-9d50-9bb40438d07e">Active programs, the exercise catalog, and recent workout logs remain viewable with the network disabled</p></div></li><li class="relative" data-id="c4da09c8-e8ad-487c-9d45-f3cb33c7aa89" data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p class="editor-paragraph-block" data-id="6bf3bd5f-dea3-45ce-a2d8-8957a3cc81b9">A workout set logged while offline is queued and appears in the log locally</p></div></li><li class="relative" data-id="4a5eb7d4-c519-4bcb-8fdb-97cb6106955d" data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p class="editor-paragraph-block" data-id="628e1b85-a397-4794-bd14-6f3e27c5e6b1">Reconnecting flushes the queued set(s) to the server automatically, in the order they were logged</p></div></li><li class="relative" data-id="041f117f-2605-42db-8483-dbe92c541e51" data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p class="editor-paragraph-block" data-id="f8875a88-ef11-41f6-82f0-aec2ad8fa3d2">The offline/syncing/synced indicator reflects the actual queue state throughout</p></div></li></ul><h2 class="editor-heading-block" data-id="16609300-00b0-4a78-a97e-fe7419cad407">Blocked by</h2><p class="editor-paragraph-block" data-id="105574c0-8e17-46fa-89cb-481751bac66b">#14 Workout logging (online), #7 Offline write-queue + sync + indicator</p>
