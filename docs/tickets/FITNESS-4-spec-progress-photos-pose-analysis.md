---
id: FITNESS-4
title: "Spec: Progress Photos & Pose Analysis"
state: Done
state_group: completed
priority: none
labels: [spec, ready-for-agent]
module: "Progress Photos & Pose Analysis"
parent: null
created: 2026-08-15
updated: 2026-09-03
plane_id: 9650a52b-5555-4c15-a1ab-5e0592db68af
---

# FITNESS-4: Spec: Progress Photos & Pose Analysis

### Problem Statement

Numbers on a scale don't show body-composition change the way photos do, but users need an easy, private way to capture consistent front/side/back photos over time, compare against a fixed reference point, and get objective feedback on pose/alignment without a human (or an LLM) looking at their body.

### Solution

A photo-session-based progress gallery: users capture up to three photos together as one session, optionally mark a session as their baseline, and get asynchronous pose/alignment analysis from a dedicated computer-vision (non-LLM) worker. Photos are uploaded directly to private object storage and never exposed via a public link. Which photo is front/side/back is detected automatically (a geometry heuristic over the same pose-landmark data the alignment analysis already computes) rather than user-labeled at upload, with a lightweight review/confirm step before a detected pose is treated as final — see ADR-013.

### User Stories

1. As a user, I want to upload up to three photos as one session, so that a single capture occasion is grouped together in my gallery.
2. As a user, I want to select all three photos at once without labeling which is front/side/back, so that uploading is faster and I don't have to remember which slot is which.
3. As a user, I want photo upload to go directly from my device to storage, so that large images don't slow down or fail through the app server.
4. As a user on a slow mobile connection, I want the upload to show progress and recover from a dropped connection, so that I don't lose a photo I just took.
5. As a user, I want to mark one photo session as my baseline, so that I have a fixed reference point for future comparisons.
6. As a user, I want the app to prevent me from having more than one baseline session at a time, so that comparisons are always against a single, unambiguous reference.
7. As a user, I want to change which session is my baseline, so that I can reset my reference point when I want to.
8. As a user, I want each uploaded photo automatically analyzed for pose and body alignment, so that I get objective feedback without waiting on a person to review it.
9. As a user, I want to see when a photo's analysis is still processing vs. complete, so that I know whether to expect results yet.

10. As a user, I want a clear message and the option to retry when analysis fails (e.g. a blurry photo or no pose detected), so that I understand what went wrong and can act on it.

11. As a user, I want my progress photos to never be viewable by anyone without my authentication, so that this sensitive personal content stays private.

12. As a user, I want photo links used by the app to expire, so that a copied/leaked link can't be used to view my photos indefinitely.

13. As a user, I want my photo gallery organized and browsable by date, so that I can flip through my progress chronologically.

14. As a user, I want to view my baseline session side-by-side with a more recent session, so that I can visually compare progress.

15. As a user, I want to delete a photo session I no longer want, so that I control what stays in my gallery.

16. As a user, I want the app to automatically figure out which photo is front/side/back, so that I don't have to label them myself.

17. As a user, I want to review and correct the app's guessed pose for each photo before it's finalized, so that a wrong guess never silently corrupts my comparisons.

18. As a user, I want to edit an individual detected pose without redoing the whole review, so that fixing one wrong guess is quick.

19. As a user, I want to see which of my sessions still need my review, so that I know when a photo's classification needs my attention.

20. As a user, I want to be prevented from marking a session as my baseline until I've confirmed its photos' poses, so that my reference point is never based on an unconfirmed guess.

21. As a user, I want the alignment/landmark analysis results to inform how photos are compared (e.g. flagging a poorly aligned photo), so that comparisons are meaningful rather than skewed by inconsistent posing.

### Implementation Decisions

- Entities per `knowledge/domain-model.md`: **Photo Session** (`photo_sessions`: user_id, date, is_baseline) groups **Progress Photo** rows (`progress_photos`: pose, analysis_status, pose_landmarks, alignment_data). Progress Photo keeps both a Photo Session link and a Daily Log link (explicit decision — not deduplicated despite encoding the same day twice; keep them in sync at write time).
- Baseline uniqueness enforced at the database level via a unique partial index on `photo_sessions(user_id) WHERE is_baseline = true` — not application-layer-only enforcement.
- **Upload flow** (see `docs/architecture.md` Data Flow): client requests a presigned MinIO PUT URL from NestJS → uploads directly to MinIO → confirms completion to NestJS → NestJS creates the `progress_photos` row (`analysis_status = pending`) and pushes a job onto the Redis queue.
- **Cross-language queue**: NestJS and the Python worker communicate over a plain Redis list/stream with a JSON payload (`{ photoId, objectKey, pose }`), not BullMQ — see ADR-003. The worker reads the photo directly from MinIO using its own service credentials (no presigned URL for this internal leg).
- **Analysis failure handling**: the worker auto-retries a job a few times with backoff before marking `analysis_status = 'failed'` permanently (see `knowledge/business-rules.md`); the UI then offers a manual retry action, which re-enqueues the same job.
- **Photo privacy**: the MinIO bucket is private (ADR-002). `progress_photos` stores an object key, never a permanent URL. NestJS mints a short-lived presigned GET URL per authenticated, ownership-checked read request — applied to every gallery view, not just upload.
- Analysis itself: Python/FastAPI service using OpenCV, MediaPipe, NumPy for pose detection, pose/alignment validation, and landmark extraction — explicitly no LLM involvement (per the original grooming note's constraint), keeping this a deterministic CV pipeline.
- **Pose auto-detection** (ADR-013): `photo_sessions` gains a `status` field (uploading/detecting/needs_review/confirmed), separate from each Progress Photo's `analysis_status` (which now means only the post-confirm alignment-analysis stage). `progress_photos.pose` is nullable until the owning session is `confirmed`.
- Detection is a geometry heuristic over MediaPipe Pose Landmarker output — no separately trained classifier — solved as a joint assignment across all photos in a session at once (maximizing total confidence, no pose used twice), not classified independently per photo.
- The queue now carries two job types on one worker codebase: `detect` (session-level, produces the joint pose assignment + landmarks, moves the session to `needs_review`) and `analyze-alignment` (per photo, dispatched only after user confirmation, reuses `detect`'s landmarks rather than re-extracting them — pose-specific alignment checks can't run before pose is confirmed).
- A low-confidence/ambiguous `detect` result is `needs_review`, a distinct outcome from `failed` — re-running the same heuristic on the same photo can't change an ambiguous result, so resolution is always a manual pose reassignment, never a retry.
- Baseline-marking requires `status = confirmed` — enforced alongside the existing unique-baseline-per-user constraint.
- Upload form is a single multi-select file input (capped at 3), replacing three separately-labeled Front/Side/Back inputs.

### Testing Decisions

- **NestJS seam**: integration tests (real test Postgres + a test MinIO/minio-mock) covering: presigned upload URL issuance, session/photo record creation on upload confirmation, baseline-uniqueness enforcement (attempting a second baseline fails), and presigned GET generation rejecting a non-owner's request.
- **Python worker seam (job-consumer)**: tests that feed real fixture images (a mix of well-posed and deliberately bad — blurry, no person, wrong pose) through the actual job-consumer function and MediaPipe pipeline, asserting on `analysis_status` outcome and the shape of landmarks/alignment data — not mocking MediaPipe.
- **Next.js seam**: Playwright E2E for the full user-visible loop — upload a 3-photo session, see it appear as processing then completed, mark it baseline, attempt to mark a second session baseline and confirm the UI prevents/handles it, view the gallery grouped by date.
- Retry-then-fail behavior is tested at the worker seam by forcing repeated failures (e.g. a corrupt fixture) and asserting the retry count and final `failed` status, not by mocking the retry mechanism.
- **Joint-assignment logic** is tested directly at the worker seam with fixture landmark sets (not real images) — both a clean case (three distinct, confident poses) and an ambiguous/duplicate-scoring case, asserting the assignment result and the `needs_review` outcome respectively.
- **NestJS seam** additionally covers the `uploading → detecting → needs_review → confirmed` state machine: confirming with edited poses, rejecting a confirm with duplicate/missing poses, and baseline-marking rejected on an unconfirmed session.
- **Next.js seam**: extend the existing upload → processing → completed E2E to cover the multi-select upload, the needs_review badge appearing in the gallery, and correcting a suggested pose in the review screen before confirming.

### Out of Scope

- Any LLM-based or subjective photo commentary/coaching — analysis is limited to deterministic CV (pose/alignment/landmarks) per the original constraint.
- Automatic photo-based body-fat-percentage estimation (only pose/alignment analysis is in scope; no derived body-composition metrics).
- Photo editing/filters/cropping tools within the app.
- Sharing progress photos outside the app (social export, public profile).
- A dedicated trained image classifier for pose/view detection — heuristic-first (ADR-013); only pursued if the geometry heuristic's real-world accuracy proves inadequate.
- Automatic re-running or reconciliation of a `needs_review` session — resolution is always a manual pose reassignment, never an automated retry.

### Further Notes

Depends on Spec: Auth & User Profile and Spec: Body-Weight Diary (for the Daily Log this attaches to). Independent of Spec: Training and Spec: Diet Engine.

Pose auto-detection (2026-08-28 addition): full technical rationale and alternatives considered in ADR-013 (`docs/decisions.md`). Implementation split into five tracer-bullet tickets: FITNESS-23 (queue plumbing, session reaches `needs_review` with stub poses) blocks FITNESS-50 (review confirm endpoint, session reaches `confirmed`) and FITNESS-51 (multi-select upload + needs-review badge, parallel to FITNESS-50); FITNESS-50 blocks FITNESS-49 (real joint-classification + review screen) and FITNESS-24 (real alignment analysis + retry, parallel to FITNESS-49).
