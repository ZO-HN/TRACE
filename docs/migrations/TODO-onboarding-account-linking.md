# TODO: wire onboarding wizard answers into a real trainee account

## Current state

`/onboarding` ([OnboardingWizardPage.tsx](../../src/components/pages/OnboardingWizardPage.tsx)) is a fully client-side wizard. It collects answers into local component state and, at the end, shows a "Thanks for reaching out" screen — nothing is persisted or sent anywhere. The invite link's screen config travels in the URL (`buildInviteLink`/`parseInviteConfig` in [src/config/onboardingScreens.ts](../../src/config/onboardingScreens.ts)), not from a live fetch, because there's no backend table for it yet.

## Why it stops there

Actually carrying the trainee's answers into a real account requires an **authenticated write**, not just UI:

1. The trainee needs to sign in (Google or email — same Supabase auth already wired in `LoginPage`/`SignupPage`) at some point in the flow, either up front or at the "Sign in to connect it" step at the end.
2. Once signed in, the wizard's collected answers need to be written to that trainee's `profiles` row (or a new onboarding-response table), scoped to the coach who generated the invite (`coach_id`).
3. That likely wants a `handle_new_user()`-style trigger (there's precedent — see `platform_settings`/`handle_new_user()` in the existing migrations) to attach the coach and the answers to the new profile atomically at signup.

This is a real auth + data-write decision — which step triggers sign-in, what table shape the answers land in, whether unauthenticated partial progress should be saved — not something to bolt on silently. It also brushes up against this repo's own boundary (`CLAUDE.md`): trainee-side writes normally belong to `TRACE-client`, and this onboarding page is already a deliberate, explicitly-approved exception to that rule, made public/unauthenticated on purpose. Adding a real authenticated write path here is a second, separate exception that deserves its own explicit sign-off.

## Next step

Before implementing, decide with the user:
- Where sign-in happens in the flow (start vs. end).
- What table/columns the answers land in.
- Whether an anonymous partial-progress save is wanted before sign-in, or answers only exist in memory until then.

Once scoped, this will need a new Supabase migration (write it, don't apply — same workflow as other migrations in this repo) plus the actual write call in `OnboardingWizardPage.tsx`.
