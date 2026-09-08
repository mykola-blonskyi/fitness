# FITNESS-4: Spec: Progress Photos & Pose Analysis

- **State**: Backlog
- **Priority**: none
- **Labels**: spec, ready-for-agent
- **Parent**: (none)
- **Blocked by**: (none)
- **Unresolved blockers**: (none)
- **Blocking**: (none)
- **Snapshot pulled**: 2026-08-22 (via VPS SSH, local sandbox network couldn't reach Plane directly)

## Description

<div><h2>Problem Statement</h2>
<p>Numbers on a scale don't show body-composition change the way photos do, but users need an easy, private way to capture consistent front/side/back photos over time, compare against a fixed reference point, and get objective feedback on pose/alignment without a human (or an LLM) looking at their body.</p>
<h2>Solution</h2>
<p>A photo-session-based progress gallery: users capture front/side/back photos together as one session, optionally mark a session as their baseline, and get asynchronous pose/alignment analysis from a dedicated computer-vision (non-LLM) worker. Photos are uploaded directly to private object storage and never exposed via a public link.</p>
<h2>User Stories</h2>
<ol>
<li>As a user, I want to upload front, side, and back photos as one session, so that a single capture occasion is grouped together in my gallery.</li>
<li>As a user, I want photo upload to go directly from my device to storage, so that large images don't slow down or fail through the app server.</li>
<li>As a user on a slow mobile connection, I want the upload to show progress and recover from a dropped connection, so that I don't lose a photo I just took.</li>
<li>As a user, I want to mark one photo session as my baseline, so that I have a fixed reference point for future comparisons.</li>
<li>As a user, I want the app to prevent me from having more than one baseline session at a time, so that comparisons are always against a single, unambiguous reference.</li>
<li>As a user, I want to change which session is my baseline, so that I can reset my reference point when I want to.</li>
<li>As a user, I want each uploaded photo automatically analyzed for pose and body alignment, so that I get objective feedback without waiting on a person to review it.</li>
<li>As a user, I want to see when a photo's analysis is still processing vs. complete, so that I know whether to expect results yet.</li>
<li>As a user, I want a clear message and the option to retry when analysis fails (e.g. a blurry photo or no pose detected), so that I understand what went wrong and can act on it.</li>
<li>As a user, I want my progress photos to never be viewable by anyone without my authentication, so that this sensitive personal content stays private.</li>
<li>As a user, I want photo links used by the app to expire, so that a copied/leaked link can't be used to view my photos indefinitely.</li>
<li>As a user, I want my photo gallery organized and browsable by date, so that I can flip through my progress chronologically.</li>
<li>As a user, I want to view my baseline session side-by-side with a more recent session, so that I can visually compare progress.</li>
<li>As a user, I want to delete a photo session I no longer want, so that I control what stays in my gallery.</li>
<li>As a user, I want to see which pose (front/side/back) each photo represents, so that comparisons line up correctly across sessions.</li>
<li>As a user, I want the alignment/landmark analysis results to inform how photos are compared (e.g. flagging a poorly aligned photo), so that comparisons are meaningful rather than skewed by inconsistent posing.</li>
</ol>
<h2>Implementation Decisions</h2>
<ul>
<li>Entities per <code>knowledge/domain-model.md</code>: <strong>Photo Session</strong> (<code>photo_sessions</code>: user_id, date, is_baseline) groups <strong>Progress Photo</strong> rows (<code>progress_photos</code>: pose, analysis_status, pose_landmarks, alignment_data). Progress Photo keeps both a Photo Session link and a Daily Log link (explicit decision — not deduplicated despite encoding the same day twice; keep them in sync at write time).</li>
<li>Baseline uniqueness enforced at the database level via a unique partial index on <code>photo_sessions(user_id) WHERE is_baseline = true</code> — not application-layer-only enforcement.</li>
<li><strong>Upload flow</strong> (see <code>docs/architecture.md</code> Data Flow): client requests a presigned MinIO PUT URL from NestJS → uploads directly to MinIO → confirms completion to NestJS → NestJS creates the <code>progress_photos</code> row (<code>analysis_status = pending</code>) and pushes a job onto the Redis queue.</li>
<li><strong>Cross-language queue</strong>: NestJS and the Python worker communicate over a plain Redis list/stream with a JSON payload (<code>{ photoId, objectKey, pose }</code>), not BullMQ — see ADR-003. The worker reads the photo directly from MinIO using its own service credentials (no presigned URL for this internal leg).</li>
<li><strong>Analysis failure handling</strong>: the worker auto-retries a job a few times with backoff before marking <code>analysis_status = 'failed'</code> permanently (see <code>knowledge/business-rules.md</code>); the UI then offers a manual retry action, which re-enqueues the same job.</li>
<li><strong>Photo privacy</strong>: the MinIO bucket is private (ADR-002). <code>progress_photos</code> stores an object key, never a permanent URL. NestJS mints a short-lived presigned GET URL per authenticated, ownership-checked read request — applied to every gallery view, not just upload.</li>
<li>Analysis itself: Python/FastAPI service using OpenCV, MediaPipe, NumPy for pose detection, pose/alignment validation, and landmark extraction — explicitly no LLM involvement (per the original grooming note's constraint), keeping this a deterministic CV pipeline.</li>
</ul>
<h2>Testing Decisions</h2>
<ul>
<li><strong>NestJS seam</strong>: integration tests (real test Postgres + a test MinIO/minio-mock) covering: presigned upload URL issuance, session/photo record creation on upload confirmation, baseline-uniqueness enforcement (attempting a second baseline fails), and presigned GET generation rejecting a non-owner's request.</li>
<li><strong>Python worker seam (job-consumer)</strong>: tests that feed real fixture images (a mix of well-posed and deliberately bad — blurry, no person, wrong pose) through the actual job-consumer function and MediaPipe pipeline, asserting on <code>analysis_status</code> outcome and the shape of landmarks/alignment data — not mocking MediaPipe.</li>
<li><strong>Next.js seam</strong>: Playwright E2E for the full user-visible loop — upload a 3-photo session, see it appear as processing then completed, mark it baseline, attempt to mark a second session baseline and confirm the UI prevents/handles it, view the gallery grouped by date.</li>
<li>Retry-then-fail behavior is tested at the worker seam by forcing repeated failures (e.g. a corrupt fixture) and asserting the retry count and final <code>failed</code> status, not by mocking the retry mechanism.</li>
</ul>
<h2>Out of Scope</h2>
<ul>
<li>Any LLM-based or subjective photo commentary/coaching — analysis is limited to deterministic CV (pose/alignment/landmarks) per the original constraint.</li>
<li>Automatic photo-based body-fat-percentage estimation (only pose/alignment analysis is in scope; no derived body-composition metrics).</li>
<li>Photo editing/filters/cropping tools within the app.</li>
<li>Sharing progress photos outside the app (social export, public profile).</li>
</ul>
<h2>Further Notes</h2>
<p>Depends on Spec: Auth &amp; User Profile and Spec: Body-Weight Diary (for the Daily Log this attaches to). Independent of Spec: Training and Spec: Diet Engine.</p></div>
