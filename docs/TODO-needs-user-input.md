# Things that can't be finished without you

Everything below needs a decision, credential, or access only you have. Nothing in this list blocked the rest of the "make every mock feature real" pass — it's what's left over.

## ~~1. Apply the pending migrations~~ — done

All migrations through `20260810000001_coach_workspace_features.sql` are applied and verified on the live project (confirmed via `npx supabase migration list` after `db push` on 2026-08-11). Every previously-mock page (Programs, Roadmaps, Vault, Training Groups, Equipment, Foods, Meals, Meal Plans, Form Checks), Notifications, and Check-in template scheduling should now work end-to-end.

## 1. Client invite emails

Clients → Invite Client → Email tab is disabled with an explanatory note (Share Link tab works today and needs no email). Sending a real email invitation needs a Supabase Edge Function + an email provider secret (Resend, SendGrid, Postmark, etc.) — pick a provider and I can wire it in a follow-up; needs your account/API key, so I can't build it silently.

The header "Feedback" button no longer needs this — it now links straight to the GitHub repo (`https://github.com/ZO-HN/TRACE`) instead of an in-app form.

## 2. Onboarding wizard → real trainee account

Fully scoped in `docs/migrations/TODO-onboarding-account-linking.md`. Short version: the `/onboarding` wizard is real UI but writes nothing to Supabase — it needs a decision on where sign-in happens in the flow and what table the answers land in before I build that part.

## 3. Dashboard analytics (signups, workouts, churn, nutrition/cardio/steps)

The dashboard's four top stat cards and the nutrition/cardio/steps panels now honestly say "not tracked yet" instead of showing fake numbers. Building these for real means 7/30-day rollup queries over `set_logs`, `workout_sessions`, `nutrition_logs`, and `wearable_biometrics` — a distinct analytics effort (likely Postgres RPCs, similar to the existing `solo_analytics_rpcs.sql` migration) rather than a simple read hook. I can scope and build this next if you want it — flagging rather than guessing at what "churn" or "workout compliance" should mean for your business.

## 4. Training Groups — member management

The Training Groups table/RLS/hook exist and a group can be created, but there's no UI yet to add/remove specific clients to a group after creation (the `training_group_members` join table is ready for it). Small follow-up, didn't want to guess the UX (roster picker in the create dialog vs. a dedicated group-detail page) without checking.

## 5. Meal Plan builder — per-meal food rows

The TDEE calculator and top-level plan (goal, method, calorie target, assigned client) now save for real. The granular per-meal, per-row food search grid inside the builder is still local-only — wiring each row to a real food reference with quantity would need a `meal_plan_items` join table and a fair amount of additional UI; flagging as a distinct follow-up rather than folding it into this pass.

## 6. Form Checks — nothing to test until TRACE-client writes to it

The Form Checks page is real (reads/reviews `public.form_checks`, plays back video via the existing R2 media viewer) but nothing populates it until a trainee submits one from the client app. See the client-app handoff doc for the exact insert shape needed.
