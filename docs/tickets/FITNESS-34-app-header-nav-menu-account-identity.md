---
id: FITNESS-34
title: "App header: nav menu + account identity"
state: Done
state_group: completed
priority: medium
labels: [ready-for-agent]
module: null
parent: null
created: 2026-08-16
updated: 2026-08-17
plane_id: b84362c3-4c11-4297-8a0d-58ec385f40f1
---

# FITNESS-34: App header: nav menu + account identity

### What to build

App-wide header (see docs/decisions.md ADR-007) rendered in [locale]/layout.tsx on every route except /onboarding. Left: Hub brand link + "Fitness" home link + a nav menu scoped to currently-built sections only (Diary, Settings), grown by one line each time a new top-level section ships its first page. Right: an identity-only account group (name/email as plain text, no dropdown, no settings link since it's already in the nav, no sign-out - the Hub has no public logout URL to delegate to, see ADR-007's Consequences). Locale switching and theme toggling are explicitly out of scope - not even placeholders - until FITNESS-11 and a new theming ticket exist.

### Acceptance criteria

- [x] The header renders on every route except /onboarding, with a Hub brand link and a "Fitness" home link
- [x] The nav menu lists only Diary and Settings (the currently-built sections) and correctly links to each
- [x] The account group shows the current user's name (or email if name is unavailable) as plain text, with no dropdown, no settings link, and no sign-out control
- [x] No locale switcher or theme toggle appears anywhere in the header

### Blocked by

None — can start immediately
