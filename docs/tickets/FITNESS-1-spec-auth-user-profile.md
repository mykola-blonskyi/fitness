---
id: FITNESS-1
title: "Spec: Auth & User Profile"
state: Done
state_group: completed
priority: none
labels: [spec, ready-for-agent]
module: "Auth & User Profile"
parent: null
created: 2026-08-15
updated: 2026-08-24
plane_id: 6332f9cd-0713-4539-9002-aee5e93c802b
---

# FITNESS-1: Spec: Auth & User Profile

### Problem Statement

A new user arriving at fitness.blonskyi.dev has no way to sign in without creating yet another account, and even once signed in, the app has no idea who they are physically (age, height, goal, activity level) — data every other feature (calorie targets, training recommendations) depends on. Without a profile, nothing else in the app can function.

### Solution

Reuse the existing Hub single sign-on (the same login already used by todo.blonskyi.dev and the user's other subdomain projects) so there's no new account to create. On first login, prompt the user to complete a fitness-specific profile (name, gender, date of birth, height, goal, activity level) that the rest of the app reads from.

### User Stories

1. As a visitor, I want to sign in with the same account I already use on my other blonskyi.dev projects, so that I don't need a new password.
2. As a signed-in user, I want the app to recognize me automatically on return visits, so that I don't have to log in every time within my session's validity.
3. As a new user who has never used this app before, I want to be guided through completing my profile before I can use any tracking feature, so that the app has the data it needs to help me.
4. As a user completing my profile, I want to enter my name, gender, date of birth, height, goal, and activity level, so that the app can calculate accurate calorie/macro targets for me.
5. As a user, I want my age to be calculated automatically from my date of birth rather than entered directly, so that it's always correct and I don't have to update it myself.
6. As a user, I want to choose my goal from weight loss, maintenance, or muscle gain, so that recommendations are tailored to what I'm trying to achieve.
7. As a user, I want to choose my activity level from sedentary through very active, so that my calorie target reflects how much I actually move.
8. As a user, I want all measurements in metric units (kg, cm), so that the app matches the unit system I actually use.
9. As a user, I want to upload or change my avatar, so that I can personalize my profile.

10. As a user, I want to edit any profile field later (not just at onboarding), so that I can correct mistakes or update my goal as it changes over time.

11. As a user, I want to see my current profile settings on a dedicated screen, so that I can review what the app knows about me.

12. As a returning user whose Hub session has expired, I want to be redirected to the Hub's login and returned to where I was afterward, so that I don't lose my place in the app.

13. As a user, I want the app to reject an attempt to view or edit another user's profile, so that my personal data stays private.

14. As a developer of another blonskyi.dev subdomain, I want fitness.blonskyi.dev to follow the same auth-integration pattern as other subdomains, so that the Hub's access-control model stays consistent across projects.

15. As a user who hasn't been granted access to this project in the Hub, I want a clear "access denied" message rather than a broken app, so that I understand why I can't get in.

16. As a user, I want my session to work correctly on mobile Safari/Chrome as a PWA (not just desktop browser), so that I can use the app installed on my phone.

### Implementation Decisions

- Auth is a **reused pattern**, not new design — copy the `todolist` project's approach verbatim (see `docs/architecture.md` Security section and `my-projects/boilerplates/subdomain-app.md`). The Hub issues an Auth.js JWT session cookie (`authjs.session-token`, domain `.blonskyi.dev`). The Next.js frontend decodes it with a shared `AUTH_SECRET` and calls the Hub's `GET /api/auth/validate?project=fitness` for per-project authorization, then forwards trusted `x-user-id`/`x-user-email` headers to NestJS on every request.
- NestJS never touches the auth cookie directly — it is internal-only (private Docker network) and trusts the forwarded identity headers.
- Register the `fitness` project slug and grant access in the Hub's `projects`/`project_access` tables as a one-time setup step (see the boilerplate's checklist).
- The **User** entity (see `knowledge/domain-model.md`) stores fitness-specific profile fields only — identity itself (email, auth) is owned by the Hub. `users.id` should align with the Hub's user id so cross-project identity stays consistent.
- Profile completion is enforced by a middleware/guard: any authenticated request for a user with an incomplete profile is redirected to the profile-completion flow before reaching other feature routes.
- Fields and enums exactly as defined in `knowledge/domain-model.md` User entity: name, email, date_of_birth, height, gender (male/female), goal (weight_loss/maintenance/muscle_gain), activity_level (sedentary/light/moderate/active/very_active), avatar_url. Age is derived at read time from date_of_birth, never stored.
- Avatar upload reuses the same private-MinIO-plus-presigned-URL pattern established for progress photos (see ADR-002), scoped to a separate avatars path/bucket-prefix since avatars are not the same sensitivity class as body progress photos (could reasonably be made public later, but default to the same private pattern for consistency until a reason to diverge appears).

### Testing Decisions

Good tests here exercise external behavior (HTTP responses and DB state), not internal call graphs — no mocking Drizzle or the Hub validation call inside a test that claims to prove the real integration works.

- **NestJS seam**: integration tests against a real test Postgres (Testcontainers), asserting on the guard/middleware behavior — request with valid forwarded headers + complete profile succeeds; incomplete profile is redirected/blocked; missing/invalid headers are rejected; a user cannot read/write another user's profile fields.
- **Next.js seam**: Playwright E2E covering the full redirect chain (unauthenticated → Hub login page reached; authenticated with incomplete profile → onboarding form shown; completed onboarding → lands on the app). Mock only the Hub's own login UI (out of this repo's control), not the validation call.
- No unit tests for the Hub validation call itself — it's a thin, already-proven integration (`todolist` already tests this pattern); re-verifying it per-project would be redundant.

### Out of Scope

- Building or modifying the Hub itself — this spec only integrates with it as-is.
- Account deletion / data export (GDPR-style flows) — not requested in the grooming note.
- Social/friend features, multi-user households, or shared profiles.
- Password reset, MFA, or any auth mechanism outside what the Hub already provides.

### Further Notes

This spec has no blocking dependencies on any other spec — it's the foundation every other feature spec assumes is already in place (a request with a trusted `user_id` and a complete profile).
