---
id: FITNESS-35
title: "Spec: Frontend Form Validation with Zod"
state: Done
state_group: completed
priority: none
labels: [spec, ready-for-agent]
module: "Frontend Form Validation with Zod"
parent: null
created: 2026-08-16
updated: 2026-08-24
plane_id: 17830163-0b25-48be-9d40-91b2939f4d14
---

# FITNESS-35: Spec: Frontend Form Validation with Zod

### Problem Statement

Right now, none of fitness's frontend forms validate anything before a network round-trip. Server Actions read raw `FormData` with `formData.get(...)` and blind type casts (`as Gender`, `Number(formData.get('height'))`) — a malformed value silently becomes `NaN` or `undefined` and gets sent to the backend as-is. The only thing that ever rejects bad input is the NestJS backend's `class-validator` DTOs, several requests later, and even then the user just sees one generic string ("Couldn't save your profile — check your inputs and try again") with no indication of which field was wrong. There's also no client-side feedback at all — a user only finds out something's wrong after a full submit-and-round-trip cycle.

### Solution

Every form-backed Server Action (`completeOnboarding`, `updateProfile`, `setWeight`) gets a single shared Zod schema that is the one source of truth for both what the form's fields look like (replacing today's hand-written `UserProfileInput` interface) and what's valid. The same schema drives real-time client-side field validation (via `react-hook-form` + `@hookform/resolvers/zod`) and the Server Action's own input parsing (`schema.safeParse`) before anything is sent to the backend. Validation failures on either side surface as field-level errors next to the relevant input, not a single generic banner message.

### User Stories

1. As a user completing onboarding, I want to see an error next to the specific field I got wrong (e.g. height) as soon as I move away from it, so that I don't have to guess what's invalid.
2. As a user completing onboarding, I want the form to catch an invalid value (e.g. a negative height) before I even submit, so that I don't waste a round-trip on something obviously wrong.
3. As a user completing onboarding, I want a submission that's actually valid to save successfully with no behavior change from today, so that this doesn't regress the happy path.
4. As a user editing my profile in settings, I want the exact same real-time, field-level validation behavior as onboarding, so that the two forms feel consistent.
5. As a user logging today's weight, I want an invalid weight (e.g. zero or negative) caught immediately, not after a failed save.
6. As a user, if my client-side validation somehow passes but the server rejects the value anyway (e.g. a stale client bundle after a deploy), I want to see the server's field-level error in the same place the client-side error would have appeared, so the experience is consistent regardless of which side caught it.
7. As a developer, I want one schema per form used by both the client validation and the Server Action's parsing, so that the two can never silently drift apart from each other.
8. As a developer, I want the existing `UserProfileInput` type replaced by a Zod-inferred type from the shared schema, so that the shape of the data and its validation rules live in exactly one place instead of two.
9. As a developer, I want a Server Action's Zod parse failure to produce the same field-level error shape that `react-hook-form`'s `setError` expects, so that server-side and client-side errors render through the same code path in each form component.

10. As a developer, I want this same shared-schema + `react-hook-form` pattern applied consistently to all three existing forms (onboarding, settings/profile, daily-log weight), even though the weight form is a single field, so there's one pattern to maintain rather than two.

11. As a developer, I want it to remain obvious that these Zod schemas are a client-side/UX convenience layer, not a replacement for the backend's `class-validator` DTOs, which stay authoritative and keep validating independently — so a future change to one doesn't get mistaken for automatically updating the other.

### Implementation Decisions

- **New dependencies**: `zod`, `react-hook-form`, `@hookform/resolvers`.
- **One shared Zod schema per form**, living in a shared location (mirroring where `UserProfileInput` etc. already live in `shared/types`), imported by both the form component and its Server Action. Two schemas needed: a user-profile schema (shared by onboarding and settings — identical field set) and a weight schema (daily-log).
- The existing hand-written `UserProfileInput` type is replaced by `z.infer<typeof userProfileSchema>`. The `Gender`/`Goal`/`ActivityLevel` union types and their `GENDERS`/`GOALS`/`ACTIVITY_LEVELS` const arrays stay as-is and get wrapped in `z.enum(...)` inside the schema rather than duplicated.
- Schema validation rules mirror the backend's current `class-validator` rules exactly where they overlap (e.g. height `min(30).max(300)`, weight `min(0.1)`) — these are a deliberate duplication of the backend's DTOs, not derived from them (no practical way to share class-validator decorators with a Zod schema across the Next.js/NestJS boundary). The backend DTOs remain the authoritative, independently-enforced source of truth; these schemas are a UX layer only.
- Each of the three forms (onboarding, settings/profile, daily-log weight) moves from today's `useActionState` + `<form action={fn}>` pattern to `react-hook-form`'s `useForm` with `zodResolver(schema)`, submitting via `handleSubmit(onSubmit)` where `onSubmit` calls the existing Server Action function directly (not via the `action` form prop). Pending state comes from `formState.isSubmitting` instead of `useActionState`'s third tuple member.
- Server Actions parse their input with `schema.safeParse` before doing anything else. On failure, the action returns the same field-level error shape it already needs for backend rejections (see below) without ever calling `apiFetch`.
- Server Action return shape is upgraded from today's `{ error?: string }` to also carry `{ fieldErrors?: Record<string, string> }` (one message per field name matching the schema's keys) alongside the existing top-level `error` string (kept for network/unexpected-failure cases that aren't tied to a specific field). The calling form component feeds `fieldErrors` into `react-hook-form`'s `setError` for each field after a failed submission, so client-side and server-side field errors render through the exact same JSX.
- A backend rejection (the `apiFetch` call itself throwing `ApiError` after schema validation already passed) still needs to produce *some* field-level or generic error — since the backend's own `class-validator` error responses don't currently expose which field failed in a structured way to the frontend, a backend-caught rejection falls back to the existing generic top-level `error` string, not fabricated field errors. Only client-side/Server-Action-side Zod failures produce real field-level errors.
- No change to `apiFetch`, `ApiError`, or any backend code — this is entirely a frontend-side addition.

### Testing Decisions

- Test the shared Zod schemas directly as pure functions (valid input passes, each invalid case per field produces the expected error) — this is the highest-value, cheapest seam, and matches the existing precedent of `backend/src/scripts/seed-exercises.spec.ts` testing pure validation/mapping logic in isolation rather than through a rendered form.
- Do not attempt to unit-test `react-hook-form`'s own wiring (resolver behavior, `setError` propagation) — that's testing the library, not this app's logic. If component-level testing is ever added for these forms (there is none today — this app currently has zero frontend test coverage, a pre-existing gap this spec doesn't fix), it belongs at the level of "does submitting invalid data show an error and not call the network," not lower.
- Server Action-level testing (does `safeParse` failure correctly short-circuit before `apiFetch`) is covered implicitly by the schema tests above plus manual verification during implementation — this app has no existing precedent for testing Server Actions in isolation, and inventing one is out of scope for this change.

### Out of Scope

- Env var validation at boot (`process.env.X!` non-null assertions in `proxy.ts`/`hub-identity.ts`) — a real, separate gap, deliberately not bundled into this change.
- Any change to the backend's `class-validator` DTOs or validation behavior.
- Any change to `apiFetch`/`ApiError` or how backend rejections are transported.
- Frontend test infrastructure in general — this spec adds schema-level tests but does not set up component/integration testing for forms as a whole.
- Any new form beyond the three that already exist today.

### Further Notes

This is a UX-quality improvement, not a security or correctness fix — the backend's `class-validator` DTOs are already the real gate, and stay that way. The value here is entirely in giving users faster, clearer feedback and giving future form additions one obvious pattern to follow (shared schema + `react-hook-form` + field-level errors) instead of the ad hoc `formData.get()` + generic-string-error pattern every form currently hand-rolls independently.
