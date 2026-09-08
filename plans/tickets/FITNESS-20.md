# FITNESS-20: Workout logging (online)

- **State**: Todo
- **Priority**: high
- **Labels**: ready-for-agent
- **Parent**: FITNESS-2
- **Blocked by**: FITNESS-14, FITNESS-19
- **Unresolved blockers**: FITNESS-19
- **Blocking**: FITNESS-21
- **Snapshot pulled**: 2026-08-22 (via VPS SSH, local sandbox network couldn't reach Plane directly)

## Description

<div><h2>Parent</h2><p>FITNESS-2 — Spec: Training Programs &amp; Workout Tracking</p><h2>What to build</h2><p>Let users start a Workout Log (from a program or ad hoc) and log sets, with history immune to later program edits.</p><h2>Acceptance criteria</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>A Workout Log can be started from an active Training Program or created ad hoc</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Sets can be logged with weight+reps for non-cardio exercises or duration for cardio-category exercises</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Editing or archiving the source Training Program after a workout was logged does not alter that Workout Log's history</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Past Workout Logs are listed by date</p></div></li></ul><h2>Blocked by</h2><p>#13 Multiple concurrent active programs, #8 Daily Log + weight logging</p></div>
