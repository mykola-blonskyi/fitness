---
id: FITNESS-53
title: "Translate all feature UI text (en/uk/ru/es)"
state: Done
state_group: completed
priority: medium
labels: [ready-for-agent]
module: "Internationalization & Offline PWA"
parent: FITNESS-6
created: 2026-08-30
updated: 2026-09-03
plane_id: 7444e5e3-f046-4889-8d33-82b88b3bcd52
---

# FITNESS-53: Translate all feature UI text (en/uk/ru/es)

### Parent

FITNESS-6 — Spec: Internationalization & Offline PWA

### What to build

FITNESS-11 delivered next-intl routing, the language switcher, and translated *nav chrome* — but every feature page and component built since (Diary, Diet, Training, Workouts, Photos, Admin, Settings, Onboarding, all forms) uses hardcoded English. `messages/en.json` only has `Header` and `LanguageSwitcher` keys; only 2 of ~60 components call `useTranslations`. Extract every user-facing string into the four `messages/*.json` files and wire the components to next-intl, completing FITNESS-6's "renders in en/uk/ru/es" acceptance criterion for the whole app rather than just the header.

### Acceptance criteria

- [x] Every user-facing string in the built feature UIs — Diary, Diet, Training, Workouts, Photos, Exercises, Food, Preferences, Settings, Onboarding, Admin — comes from `messages/*.json`, not a hardcoded literal: headings, button labels, helper/empty-state text, and error/validation messages included
- [x] All four locale files (en, uk, ru, es) have a value for every key; uk/ru/es are real translations, not copies of the English string
- [x] Switching language via the existing switcher re-renders every page in the chosen language with no English leaking through
- [x] Server Components use `getTranslations`, Client Components use `useTranslations`; no new i18n dependency is added
- [x] A guard against new hardcoded strings exists — at minimum next-intl is configured so a missing key is loud (throws in dev / flagged in CI), ideally a lint rule or check script

### Notes

Large but mechanical. Namespacing per feature (e.g. `Diary`, `Diet`, `PhotoSessions`) keeps the message files navigable. Machine-translate uk/ru/es first pass (same DeepL path the food/exercise seed scripts use) then leave a review note, mirroring the "imported data is unverified until reviewed" convention. Food/exercise *catalog* content already has its own translation tables — this ticket is about the app's own UI strings, not catalog data.

### Blocked by

#11 next-intl UI chrome (Done)
