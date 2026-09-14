# Senior frontend audit — `frontend/` (Next.js App Router)

Repo: `/home/mykola/workspace/fitness` @ `d90aee6`. Read-only; nothing in the repo was modified.

All paths below are relative to `/home/mykola/workspace/fitness/`.

---

## F1. Any path containing a dot skips `proxy.ts`, so a Server Action can be invoked with forged identity headers

- **Kind:** SECURITY
- **Severity:** critical
- **Where:** `frontend/src/proxy.ts:112` (matcher), `frontend/src/shared/libs/api-client.ts:26-32` (header read-back), `backend/src/identity/parse-identity.ts:66-75` (unconditional trust)
- **What:** The matcher is `'/((?!api|_next|_vercel|.*\\..*).*)'`. The `.*\..*` clause is unanchored, so it excludes *any* path with a dot anywhere, not just static files. Verified against the real regex in node:

  ```
  /en/diary               PROXY RUNS
  /en/workouts/abc        PROXY RUNS
  /en/workouts/a.b        PROXY SKIPPED
  /en/photos/gallery/x.y  PROXY SKIPPED
  /en/training/1.0        PROXY SKIPPED
  ```

  `/en/workouts/a.b` still matches the `workouts/[id]` route, so Next will serve it — but with no proxy run, nothing overwrites the client's `x-user-id`/`x-user-email`. `apiFetch` then reads those two headers straight off the incoming request (`api-client.ts:29-31`) and forwards them to NestJS, whose `parseIdentity` trusts them unconditionally on the documented basis that "the proxy always sets them".
- **Failure:** A Server Action is dispatched by the `Next-Action` header to *whatever page URL the POST targets*, and every action id is a build-time constant embedded in the public `/_next/static/*` chunks (every `'use client'` form imports its action). So, with no session cookie at all:
  1. `GET /_next/static/chunks/…` (outside the matcher) and extract the `createServerReference("…")` id for e.g. `completeOnboarding` or `deletePhotoSession`.
  2. `POST /en/workouts/a.b` with `Next-Action: <id>`, `Origin: https://fitness.blonskyi.dev`, `x-user-id: <any sub>`, `x-user-email: <any email>`, and the action's argument array as the body.

  The proxy never runs, the action executes, and NestJS acts as that identity. With `completeOnboarding` (`POST /users/me`, `@ProfileOptional`) this self-provisions an account for an arbitrary `sub` — bypassing the login.blonskyi.dev approval + `fitness` client-membership check that ADR-018 names as the *only* authorization gate. With a known victim `sub` it is full account takeover (delete their photo sessions, rewrite their profile).
- **Fix:** Narrow the dot exclusion to real static extensions, anchored to the end:
  `matcher: ['/((?!api|_next|_vercel|.*\\.(?:ico|png|jpg|jpeg|svg|webp|webmanifest|js|css|txt|xml|json)$).*)']`.
  Durable follow-up (defence in depth, so a future matcher edit can't reopen this): stop reading identity from request headers in `apiFetch` — resolve it from the session cookie (`getToken` with `cookies()`, the same call `identity.ts` already makes) and throw when absent.

---

## F2. The service worker caches every authenticated page and nothing clears it on sign-out

- **Kind:** SECURITY
- **Severity:** high
- **Where:** `frontend/public/sw.js:76-78` and `92-105`; `frontend/src/shared/ui/components/SignOutButton.tsx:26`
- **What:** Navigation requests are network-first with every successful response written to `fitness-runtime-v1` (`sw.js:96-98`). That means the fully-rendered HTML of `/en/diary`, `/en/diet`, `/en/photos` — weight, date of birth, diet plan, presigned photo URLs — sits in Cache Storage indefinitely. There is no TTL, no `caches.delete` on sign-out, and `SignOutButton` only POSTs to `/api/auth/signout`, which clears the cookie and nothing else. `sw.js:32-40` acknowledges this but justifies it with "this app has no sign-out at all yet" — that is stale; `SignOutButton` is rendered in `TopBar` on every page.
- **Failure:** Shared/household tablet. User A signs out. User B (or anyone with the device) enables airplane mode and opens `https://fitness.blonskyi.dev/en/diary`. `fetch` fails, `networkFirst` falls back to `cache.match(request)`, and A's last diary page — weight history and diet — renders in full, with no session. Same on a normal network blip while B is signed in: B's reload of `/en/diary` can serve A's cached copy, because the cache is keyed by URL only.
- **Fix:** Have the sign-out path message the worker (or call `caches.delete('fitness-runtime-v1')` from `SignOutButton` before submitting) so the runtime cache is dropped; and stop caching navigations for authenticated routes, or key them per user.

---

## F3. Infinite-scroll `loadMore` has no `catch`, so one failed page permanently freezes the list

- **Kind:** BUG
- **Severity:** high
- **Where:** `frontend/src/features/food-catalog/components/FoodList.tsx:44-52`, `frontend/src/features/exercise-catalog/components/ExercisesList.tsx:54-59`, `frontend/src/features/admin-exercises/components/AdminExerciseQueue.tsx:42-47`, `frontend/src/features/admin-food-items/components/AdminFoodItemQueue.tsx:44-49`
- **What:** All four follow the same shape: `setLoadingMore(true)` → `await listX(...)` → `setLoadingMore(false)`. No `try`/`finally`, and the caller is `void loadMore(cursor)` (e.g. `FoodList.tsx:60`), so a rejection is an unhandled promise rejection.
- **Failure:** User on the Food catalogue scrolls; the next-page Server Action fails (backend restart during a deploy, a 500, or a dropped connection on mobile). `setLoadingMore(false)` never runs, so the guard at the top of the effect (`if (!lastVirtualItem || loadingMore || !cursor) return;`) is true forever. The "Loading more…" line stays on screen, no error is shown, and no further scrolling ever loads another row until the user manually reloads the page.
- **Fix:** Wrap the body in `try { … } catch { setError(t('loadError')) } finally { setLoadingMore(false) }` in each of the four (the pickers, `ExercisePicker.tsx:34-46`, already do exactly this — reuse that shape).

---

## F4. A redirect from the proxy turns an expired session into silent data loss on submit

- **Kind:** BUG
- **Severity:** high
- **Where:** `frontend/src/proxy.ts:70-73`, `frontend/src/shared/offline/create-synced-write.ts:51-62`, `frontend/src/features/daily-log/components/WeightForm.tsx:48-60`, `frontend/src/features/workout-logs/components/LogSetForm.tsx:57-80`
- **What:** The session cookie's `maxAge` is 24h (`auth.ts:39`). A Server Action POSTs to the current page URL, so it goes through the proxy; once the token is gone, `resolveIdentity` returns `null` and the proxy answers the POST with a 307 to `/en/login`. The browser follows it and the action client receives HTML instead of an action payload, which React throws on. That throw is not a `TypeError` matching `/fetch|network/i`, so `isNetworkError` (`network-error.ts:5-7`) is false and `createSyncedWrite` re-throws instead of queueing. `WeightForm.onSubmit` / `LogSetForm.onSubmit` have no `try`/`catch`, and react-hook-form's `handleSubmit` re-throws from its `finally`.
- **Failure:** User leaves the diary tab open overnight. In the morning they type their weight and press "Log". The request 307s to the login page, the promise rejects, nothing is rendered (`errors.root` is never set, `queued` stays false), the button returns to "Log", and the weigh-in is gone. Same for a workout set mid-session.
- **Fix:** In the proxy, answer a request that carries `Next-Action` (or `RSC`) with `401` instead of a redirect, and in `createSyncedWrite`'s `catch` surface a re-authenticate message rather than re-throwing — at minimum wrap both `onSubmit` bodies in `try/catch` that calls `setError('root', …)`.

---

## F5. `DietMenu` reorder leaves every control permanently disabled when the action fails

- **Kind:** BUG
- **Severity:** medium
- **Where:** `frontend/src/features/diet/components/DietMenu.tsx:64-69` and `109-116`
- **What:** `onMove` sets `movingPosition`, awaits `moveDietMeal`, then clears it — with no `try`/`finally`. `interactionsDisabled` (`DietMenu.tsx:60-61`) is derived from `movingPosition !== undefined`, and it disables both arrow buttons on every meal plus the drag handles. `onDragHandlePointerUp` has the same gap around `reorderDietMeals`.
- **Failure:** On a flaky mobile connection the user taps "Move up" on Meal 2. `moveDietMeal` rejects. `setMovingPosition(undefined)` never runs, so every up/down button on the page is disabled and every drag handle is `pointer-events-none opacity-30`. No error message appears. Reordering is dead until the user reloads.
- **Fix:** `try { await moveDietMeal(...); router.refresh(); } catch { setError(...) } finally { setMovingPosition(undefined) }`, and the equivalent around `reorderDietMeals`.

---

## F6. No `error.tsx` or `not-found.tsx` anywhere — one backend hiccup replaces the whole app with an unstyled English page

- **Kind:** UX
- **Severity:** medium
- **Where:** `frontend/src/app/` (no `error.tsx`, `not-found.tsx`, `loading.tsx` or `<Suspense>` exists anywhere — verified by `find` and `grep`); fallback is `frontend/src/app/global-error.tsx:16-26`
- **What:** Every page calls `apiFetch`, which throws `ApiError` on any non-2xx (`api-client.ts:60`). With no nested error boundary, that bubbles to `global-error.tsx`, which renders `<NextError statusCode={0} />` — Next's bare default error page, outside the locale layout, outside the app shell. `notFound()` (used in `admin/layout.tsx:15` and `photos/gallery/[id]/page.tsx:62`) likewise falls to Next's built-in 404, hardcoded in English.
- **Failure:** The backend container restarts during a deploy (a routine event — Coolify deploys on every push to `main`). A Ukrainian user on `/uk/diary` taps a nav item; `apiFetch` throws; the entire viewport becomes a white English "Application error" page with no nav, no locale, and no retry — the only way back is editing the URL. A non-admin who guesses `/uk/admin/exercises` gets the same treatment via `notFound()`.
- **Fix:** Add `frontend/src/app/[locale]/error.tsx` (a client component with a translated message and `reset()`) and `frontend/src/app/[locale]/not-found.tsx`.

---

## F7. The proxy makes a backend round trip on every request, including every `<Link>` prefetch

- **Kind:** PERF
- **Severity:** medium
- **Where:** `frontend/src/proxy.ts:29-42` and `84-89`
- **What:** `hasCompletedProfile` does an uncached `fetch(BACKEND_URL/users/me)` on every request the matcher accepts, before the page is even routed. It runs for RSC prefetches too — and `Rail.tsx:38-48` plus `MobileTabs.tsx:101-107` render ~10 `<Link>`s, all of which Next prefetches on viewport entry by default.
- **Failure:** First paint of any page fires ~10 prefetch requests; each one adds a separate `/users/me` call from the proxy, on top of the same call the page tree already makes (`(app)/layout.tsx:19` and again in `diary/page.tsx:116`, `page.tsx:112`). One home-page visit costs roughly a dozen extra backend round trips purely for a profile-completeness flag that changes once in a user's lifetime.
- **Fix:** Record profile completion in the JWT at sign-in (`jwt-callback.ts` already shapes the token) and read it from `resolveIdentity`, so the proxy makes no network call; or at minimum skip `hasCompletedProfile` when the request is a prefetch (`req.headers.get('Next-Router-Prefetch')`).

---

## F8. `.input` removes the focus ring and replaces it with a 1px border tint

- **Kind:** A11Y
- **Severity:** medium
- **Where:** `frontend/src/app/[locale]/globals.css:291`
- **What:** `.input { … focus:border-ink focus:outline-none }`. Every text input, number input, date input and `<select>` in the app uses this class (`ProfileFields.tsx`, `WeightForm.tsx:77`, `LogSetForm.tsx`, `FoodSearchForm.tsx:49`, …). The only focus affordance left is `--line` → `--ink` on a 1px border.
- **Failure:** A keyboard user tabbing through the onboarding form (9 consecutive fields) has no visible indicator of which field is focused beyond a 1px edge darkening — in the `glass` theme the border is `rgba(35,36,74,0.1)` over a translucent card, so the change is essentially invisible. WCAG 2.4.7 / 1.4.11 failure on the app's primary data-entry surface.
- **Fix:** Replace `focus:outline-none` with a visible ring, e.g. `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ink)]`.

---

## F9. `glass` theme muted text fails AA contrast (~3.6:1) — including every form label

- **Kind:** A11Y
- **Severity:** medium
- **Where:** `frontend/src/app/[locale]/globals.css:151` (`--muted: #7a7ca3`), consumed by `.label` (`:294`), `.kicker` (`:297`) and `text-muted` throughout
- **What:** In `glass`, `--surface` is `rgba(255,255,255,0.66)` over a pastel gradient, giving an effective background around `#f4f1ff`. `#7a7ca3` against that is ≈ **3.6:1**. The other three themes land at 4.6–5.8:1, so this is a single-theme outlier, not a system-wide choice.
- **Failure:** A user who picks "Glass" in Appearance settings gets every form field label (`.label`, 12px), every section kicker, and every secondary value (the "72 kg" line in the diary timeline, macro rows, sync status) below the 4.5:1 AA threshold for normal text.
- **Fix:** Darken `glass`'s `--muted` to roughly `#5c5e85` (≈4.6:1 against the same ground). Also worth re-checking `lime`'s `--muted` on `--surface-2` (#6d7278 on #f3f4f0 ≈ 4.39:1, marginally under).

---

## F10. Photos and gallery pages make one backend round trip per photo to mint a presigned URL

- **Kind:** PERF
- **Severity:** medium
- **Where:** `frontend/src/features/photo-sessions/components/PhotoSessionList.tsx:36-40`, `frontend/src/features/photo-sessions/components/GalleryList.tsx:70`, `frontend/src/features/photo-sessions/components/SessionComparison.tsx:19`, via `frontend/src/features/photo-sessions/photo-view-url.ts:6-9`
- **What:** `/photo-sessions` returns every session with its photos in one call; then each photo triggers its own `GET /photo-sessions/photos/<id>/view` to fetch a presigned URL. There is no batch endpoint and no per-render memoisation.
- **Failure:** A user with a year of weekly sessions (≈50 sessions × 3 poses) opens `/en/photos`. The page issues ~150 sequential-per-row backend calls, each of which signs a MinIO URL, before a single byte of HTML is flushed — and with no `loading.tsx` (F11) the screen stays on the previous page throughout.
- **Fix:** Have the backend include the presigned `viewUrl` on each photo in the `/photo-sessions` response (it already signs one per photo on request), and drop `fetchPhotoViewUrl` from the render path.

---

## F11. No `loading.tsx` or `Suspense` — navigation blocks on up to 11 backend calls with no feedback

- **Kind:** UX
- **Severity:** medium
- **Where:** `frontend/src/app/[locale]/(app)/page.tsx:106-122` (9 parallel `apiFetch` calls), `frontend/src/app/[locale]/(app)/diary/page.tsx:110-120` (6 more), `frontend/src/app/[locale]/(app)/layout.tsx:19` (+1), plus the proxy's own (F7); no `loading.tsx` or `<Suspense>` exists anywhere in `frontend/src/app/`
- **What:** Every page is fully dynamic (`cache: 'no-store'` in `api-client.ts:46` plus `headers()`), and the whole tree awaits before anything streams.
- **Failure:** On mobile the user taps the "Home" tab. The tab highlight does not move and nothing renders until the slowest of ~11 round trips finishes; on a 3G connection that is well over a second of an apparently dead app, with no spinner or skeleton. The user taps again, which re-issues the whole set.
- **Fix:** Add `frontend/src/app/[locale]/(app)/loading.tsx` with a skeleton, and wrap the independent tiles on Home (`WeightTrendChart`, the diet tile, the photo tile) in `<Suspense>` so the shell paints immediately.

---

## F12. `kcal`, `g` and the `P`/`C`/`F` macro letters are hardcoded English

- **Kind:** UX (i18n)
- **Severity:** medium
- **Where:** `frontend/src/features/food-catalog/components/FoodList.tsx:110-113`, `frontend/src/app/[locale]/(app)/diary/page.tsx:192` and `:205`, `frontend/src/app/[locale]/(app)/page.tsx:411` and `:421`, `frontend/src/features/diet/components/NutritionsInfo.tsx:21,27,33`, `frontend/src/features/admin-food-items/components/AdminFoodItemQueue.tsx:143-146`, `frontend/src/app/[locale]/(app)/page.tsx:80` (`{planned} / {target} g`)
- **What:** These render literal `kcal`, `g`, `g P`, `g C`, `g F` outside the message catalogue, while the neighbouring strings in the same components go through `t()`. `.toFixed(1)` also forces a `.` decimal separator regardless of locale.
- **Failure:** A Ukrainian or Russian user browsing the food catalogue sees `156 kcal · 12.4g P · 3.1g C` instead of `156 ккал · 12,4 г Б · …`. The macro letters in particular are meaningless in Cyrillic (protein/carbs/fat are Б/В/Ж) and in Spanish (P/H/G).
- **Fix:** Move these into `messages/*.json` as ICU messages with `{value, number}` arguments (the catalogue already does this correctly for `Diet.itemSummary` and `Diet.macroSummary` — follow that pattern).

---

## F13. Six surfaces print raw ISO dates instead of the locale format

- **Kind:** UX (i18n)
- **Severity:** medium
- **Where:** `frontend/src/app/[locale]/(app)/photos/gallery/[id]/page.tsx:39`, `frontend/src/features/photo-sessions/components/GalleryList.tsx:45`, `frontend/src/features/photo-sessions/components/PhotoSessionList.tsx:49`, `frontend/src/features/photo-sessions/components/SessionComparison.tsx:74`, `frontend/src/app/[locale]/(app)/workouts/[id]/page.tsx:51`, `frontend/src/features/workout-logs/components/WorkoutLogList.tsx:32`
- **What:** These render `{session.date}` / `{log.date}` — the raw `YYYY-MM-DD` string — while `diary/page.tsx:142` and `page.tsx:141,169,313` correctly use `getFormatter().dateTime(...)` for the same kind of value.
- **Failure:** A Spanish user opens a photo session detail page: the `<h1>` is `2026-09-14`, whereas the diary page one tap away shows `lunes, 14 sept`. Inconsistent within a single session, and ISO dates are not what any of the four locales use conversationally.
- **Fix:** Route all six through `getFormatter().dateTime(new Date(iso + 'T00:00:00Z'), …)`, the same call `diary/page.tsx:142` already makes.

---

## F14. Offline replay has no idempotency key, so a flaky connection duplicates logged sets

- **Kind:** BUG
- **Severity:** medium
- **Where:** `frontend/src/shared/offline/create-synced-write.ts:51-62`, `frontend/src/shared/offline/drain-queue.ts:33-45`, `frontend/src/features/workout-logs/offline.ts:19-29`
- **What:** When the action's fetch fails with a network error, the payload is enqueued and replayed later. Nothing distinguishes "the request never reached the server" from "the request succeeded but the response was lost", and `POST /workout-logs/:id/sets` creates a new row every time it is called.
- **Failure:** Mid-workout on a weak connection, the user logs "100 kg × 8". The request reaches the backend and the set is written, but the response is lost and the fetch rejects as a `TypeError`. `isNetworkError` is true, so the write is queued. On reconnect `drainQueue` replays it and the set is written a second time. The user's workout shows two identical sets and the "sets logged" counts on Home and Diary are wrong.
- **Fix:** Generate the client-side id at enqueue time (the queue already mints `crypto.randomUUID()` at `offline-queue-store.ts:62`), send it as the set's id / an `Idempotency-Key`, and have the backend upsert on it.

---

## F15. A queued write that fails on replay is discarded with no user-visible trace

- **Kind:** UX
- **Severity:** medium
- **Where:** `frontend/src/shared/offline/drain-queue.ts:36-45`, `frontend/src/shared/offline/offline-queue-store.ts:77-88`
- **What:** On a non-network error the item is pushed to `dropped`, reported to Sentry, and removed. The store then does `set({ queue: remaining })` and ignores `dropped` entirely — nothing in `useSyncStatus`/`OfflineIndicator` ever reflects it.
- **Failure:** A user logs six sets in a basement gym with no signal. On the way home, connectivity returns and the drain replays them; the workout log was deleted from another device (or one payload fails validation), so `logWorkoutSet` returns `{ error }`, `getResultError` converts it to a throw, and the item is dropped. The sync dot flips straight from "syncing" to "synced" (green) and the user believes all six sets were saved. They were not.
- **Fix:** Keep `dropped` in the store, and have `OfflineIndicator` surface a `failed` state with the count and a way to view/retry them.

---

## F16. `ThemeSwitcher` declares an ARIA radiogroup but implements none of the keyboard contract

- **Kind:** A11Y
- **Severity:** low
- **Where:** `frontend/src/features/settings/components/ThemeSwitcher.tsx:54-70`
- **What:** A `role="radiogroup"` wrapping four `role="radio"` buttons, each an ordinary tab stop, with no `onKeyDown` and no roving `tabIndex`.
- **Failure:** A screen-reader user on `/en/settings/appearance` hears "Lime, radio button, not checked, 1 of 4" and presses Arrow Down, as the role promises. Nothing happens; they must guess that Tab plus Space is the actual interaction.
- **Fix:** Either implement roving tabindex + arrow handling, or drop the ARIA roles and use four real `<input type="radio">` in a `<fieldset>` with a visually-hidden legend.

---

## F17. The mobile "More" sheet has no Escape key and no focus management

- **Kind:** A11Y
- **Severity:** low
- **Where:** `frontend/src/shared/ui/shell/MobileTabs.tsx:37-75`
- **What:** Opening "More" renders a backdrop plus a panel of links. There is no `Escape` handler, focus is not moved into the panel, and focus is not restored to the trigger on close. The `aria-expanded` button has no `aria-controls`.
- **Failure:** A keyboard or switch user on mobile opens "More"; focus stays on the trigger, so Tab walks *past* the newly-rendered links into the tab bar behind, and Escape does not dismiss the sheet. The only way to close it is to find the ✕ button by tabbing backwards.
- **Fix:** Add a `keydown` listener for `Escape` that calls `setOpen(false)`, move focus to the first link on open, and restore it to the trigger on close.

---

## F18. `moveDietMeal` reorders `dietId` using the order it read from `/diets/current`

- **Kind:** BUG
- **Severity:** low
- **Where:** `frontend/src/features/diet/actions.ts:156-171`
- **What:** The action takes `dietId` but computes the swap from `apiFetch('/diets/current')` — a different diet if the user regenerated in another tab. It is also the only mutating action in the feature with no `Sentry.withServerActionInstrumentation` wrapper and no error handling.
- **Failure:** Two tabs open on `/en/diet`. Tab B regenerates (which inserts a *new* diet row — see `generateDiet`'s comment). In tab A the user presses "Move down": the order is read from the new current diet and then `PUT` to the stale `dietId`, writing a meal order derived from a different plan (or 404ing with no message, since there is no catch).
- **Fix:** Fetch `/diets/${dietId}` instead of `/diets/current`, and wrap it like the other actions in the file.

---

## F19. `HUB_URL` is not validated, so a missing value renders a link to `undefined/en`

- **Kind:** BUG
- **Severity:** low
- **Where:** `frontend/src/shared/ui/shell/Rail.tsx:54`
- **What:** `href={`${process.env.HUB_URL}/${locale}`}`. Every other required env var in the frontend goes through `requireEnv` (`proxy.ts:9-10`, `auth.ts:9-10`, `identity.ts:10`), which fails loudly at module load; this one does not. `docker-compose.yml:120` passes `${HUB_URL}` through, so an unset value in Coolify is silent.
- **Failure:** `HUB_URL` unset in the deploy environment → every desktop page renders a visible "Hub ↗" link pointing at `undefined/en`, which 404s on the app's own origin.
- **Fix:** `const HUB_URL = requireEnv('HUB_URL')` at module scope, matching the other three.

---

## F20. `/manifest.webmanifest` is cached cache-first but its content is per-user

- **Kind:** BUG
- **Severity:** low
- **Where:** `frontend/public/sw.js:84`, `frontend/src/app/manifest.ts:15-24`
- **What:** `manifest.ts` reads the `NEXT_LOCALE` and `fitness-theme` cookies to pick `start_url` and `theme_color`, i.e. it is deliberately dynamic. `sw.js` serves it cache-first from a cache that is never invalidated (the cache name is a constant `v1`).
- **Failure:** A user installs the PWA in English with the Lime theme, then switches to Ukrainian and Midnight. The manifest served to the browser never changes, so the installed icon keeps launching `/en` with a light splash screen forever.
- **Fix:** Drop `/manifest.webmanifest` from the cache-first list in `sw.js:84` (leave it to the network), or move it to network-first.

---

## Healthy

Checked and found sound:

- **Server Action authorization.** Every mutating action funnels through `apiFetch` → NestJS, and the backend scopes every read/write to the resolved `users.id` (`photo-sessions.service.ts` `findOwnedSession`/`assertOwnedObjectKey`, `diets.service.ts`, etc.). `/admin/*` is additionally behind `AdminGuard` (`backend/src/admin/admin.guard.ts:19`), so the client-side `notFound()` in `admin/layout.tsx` is presentation only, not the gate. No action trusts a client-supplied user id. (F1 is about the *transport* of identity, not this layer.)
- **Intl/auth middleware ordering.** `proxy.ts` runs `handleI18nRouting` first, short-circuits on its redirect, only then resolves identity, and rebuilds the response via a single `NextResponse.next({request})` so forwarded headers actually reach the server — with `X-NEXT-INTL-LOCALE` replicated and the locale cookie copied across. The `/health` and `/login` exemptions are both correct and minimal.
- **Header forgery on matched routes.** `headers.set('x-user-id', …)` overwrites whatever the client sent, so on every path the matcher accepts, forgery is impossible.
- **Server/client boundary.** No secret reaches the client: the only `NEXT_PUBLIC_` var is the Sentry DSN, `AUTH_SECRET`/`OIDC_CLIENT_SECRET`/`BACKEND_URL` are read exclusively in server modules, and `api-client.ts` imports `next/headers` (which would hard-fail in a client bundle). `'use client'` is pushed to leaves — pages and layouts are all Server Components, and the shell only marks `TopBar`/`MobileTabs`/`NavLink` as client.
- **Sentry PII discipline.** `sentry-shared.ts` scrubs `user`, `request.data`, `request.cookies` and `request.headers` on both the error and the transaction pipeline, and no action passes `formData` to `withServerActionInstrumentation`. Matches ADR-006.
- **Open-redirect on sign-in.** `callbackUrl` flows from `searchParams` into a hidden form field posted to Auth.js, whose default redirect callback rejects off-origin URLs; the proxy itself builds the value from `APP_URL` + the request path.
- **Debounced search pickers.** `ExercisePicker`, `SwapPicker` and `FoodItemPicker` all use a 250ms timeout plus a `cancelled` flag in cleanup — no stale-response races, and all three handle errors.
- **i18n key parity.** `scripts/check-i18n-messages.mjs` enforces exact key-set equality across all four locales in CI; all four files are the same size and `i18n/request.ts` throws on a missing key outside production. Pluralisation uses proper ICU `{count, plural, …}` in 13 places.
- **Keys and list rendering.** No index keys anywhere; every list keys on a stable id (grep confirmed zero `key={i}`/`key={index}`).
- **Images.** Every raster image goes through `next/image` with an explicit width/height; decorative thumbnails use `alt=""`, and every photo of the user carries a translated `alt` (`PhotoSessionList.tsx:90`, `SessionComparison.tsx:122`, `PhotoSessionReview.tsx:70`, `GalleryList.tsx:81`).
- **Form labelling and error announcement.** Every input in `ProfileFields`, `WeightForm`, `LogSetForm` and the search forms has a real `<label htmlFor>` or an `aria-label`; `FieldError` carries `role="alert"`, so validation failures are announced.
- **Double-submit.** Every submit button is gated on `isSubmitting`/`isPending`/`submittingId`; destructive actions (`DeleteSessionButton`, `RegenerateButton`) use an explicit confirm step.
- **Offline queue ownership.** `offline-queue-store.ts:51-58` clears the queue on a user switch before the drain effect runs (`useOfflineSync.ts:19-23`), so a shared-device handover cannot flush one user's writes under another's identity. Concurrent drains are guarded by `isSyncing`.
- **Drag-and-drop accessibility.** The `DietMenu` drag handle is `aria-hidden` and duplicated by real up/down buttons with translated `aria-label`s — the right call, not a fake button that does nothing on Enter.
- **Theme bootstrapping.** The inline pre-paint script plus `ThemeBoot`'s `useLayoutEffect` re-apply avoids both FOUC and React 19's attribute stripping; `auto` resolves correctly through the `prefers-color-scheme` block at `globals.css:187-215`.
