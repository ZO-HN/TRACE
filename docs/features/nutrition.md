# Nutrition and food tracking

Status: intake logging and coach meal-plan publication implemented locally; hosted/native acceptance remains required. Owner: TRACE maintainers. Updated: 2026-11-07. Sources: mobile nutrition mapper/outbox/hooks, coach food/meal/plan hooks, canonical publication/saved-meal migrations, diagnosis D14/D15/D17-D19, and the prior nutrition integration proposal credited in [sources](../sources.md).

## Outcome and current boundary

Trainees log food/calories/macros quickly; authorized coaches inspect summaries. Mobile has quick entry, personal foods/favorites/supplements/meal templates, and a durable nutrition outbox. Coach foods/meals/meal-plan drafts remain separate from published delivery. An explicit server publication now creates a fixed, dated meal-plan copy with food/serving/macro snapshots and calorie target for the linked trainee. Saving a draft alone does not deliver it. [Delivery contract and verification](../qa/nutrition-delivery-2026-11-07.md) defines supported day/meal limits, date precedence, rounding, offline copies and remaining gates. AI is unavailable for V1 by owner decision; existing provider integration code is not accepted live inference.

## Behavior required for acceptance

- Save intake values as historical snapshots rather than recalculating old logs from an edited catalog. Current mapper copies calories and protein/carbohydrate/fat grams. Explicit serving quantity/unit, food-source provenance, and correction behavior need specification/schema work before claiming support.
- Validate finite, non-negative amounts/macros and intentional units; reject malformed/ambiguous input visibly. Preserve usable precision and round only at defined calculation/display boundaries.
- Preserve the logged local calendar date across retries/midnight. Timestamp/timezone policy must be explicit for travel and historical edits; avoid silently moving entries between days.
- New records capture `recorded_date` in the trainee's local calendar alongside the absolute `logged_at` timestamp. Day/week/history reads use that captured date, including after travel. Legacy records without a date keep the prior timestamp/local-display fallback; no timezone is guessed or backfilled. Complete-week reads page the full selected range rather than a recent-200 sample.
- Await durable local save before reporting success; pending entries survive restart and retry once by stable ID. Keep failed entries and user input recoverable.
- Calculate whole-day totals from all records for that date, including a deduplicated local-pending overlay. A recent-50 list is not a complete daily total.
- Distinguish an empty food catalog from network/permission failure. Search/paginate large catalogs; cached recent foods remain account-scoped.
- Coach access follows the shared relationship/RLS contract. Another coach/trainee cannot read personal intake.

## Coach food, meal and meal-plan lifecycle

The coach `useFoods`, `useMeals`, and `useMealPlans` hooks keep visible rows scoped to the current coach. A changed coach hides the prior rows/error immediately. Each effect setup, including StrictMode replay, owns its requests; only the latest request from the active setup can settle loading or replace rows. Unmounting invalidates pending completions. Failed or rejected reads expose an error, retain only same-coach data, and support retry through an additive `refresh()` hook method. Routed retry controls are not added by this hook-only repair.

Create/delete methods retain their existing query/payload/default behavior and return actionable mutation errors, including rejected transports. A successful write refreshes only its originating, still-active setup; late completion cannot refresh or restore another coach's data. A committed write followed by a failed reload remains a successful mutation with a separate read error. Switching accounts does not cancel or roll back an already sent server operation. Server permissions remain authoritative.

See [coach nutrition lifecycle evidence](../qa/coach-nutrition-lifecycle-2026-11-01.md). This repairs only these hooks' D04 scope, not numeric/serving policy, mobile logging, or coach-to-trainee plan/target delivery. Other diagnosed lifecycle and integration gaps remain open.

## Mobile logging flow

The Nutrition screen prioritizes today's energy and protein/carbohydrate/fat totals, followed by food entry and meal sections; existing weekly/training insights follow the meals. Display logged quantities rather than target progress while nutrition targets are unavailable. Daily reads page through the local calendar day's records rather than using a recent-50 total, and merge the account-owned durable outbox by stable ID. Loading, incomplete totals after a read failure, empty meals, pending delivery, and failed sync are separate states.

Start with three meal sections and restore higher numbered sections referenced by saved entries. Additional empty sections remain session-local. The primary Add food action opens meal 1; each section has its own labeled add action. Existing records without a meal slot retain the chronological fallback grouping. Rename/edit/delete and nutrition target assignment remain outside this change.

Quick Add provides a labeled multiline field, parsed-value review, non-negative finite value validation, and a save action that reports device persistence before cloud delivery. Plain dot and comma decimals are accepted; scientific notation and malformed numeric sequences (including repeated decimal separators) are unsupported. If a recognized quantity is invalid, reject the entire entry even when other macros are valid, and retain the input for correction. Validate every recognized occurrence before retaining the first value for repeated labels; a later invalid duplicate also invalidates the entire entry. Food names alone do not infer nutrition. Failed writes retain input. Keyboard avoidance, scrolling, safe-area spacing, labeled controls and larger meal actions support small screens. Catalog reads expose loading and retryable errors separately from an empty catalog; catalog/template creation requires a connection, while intake logging keeps its existing offline outbox path. These UI changes do not establish native-device or authenticated backend acceptance.

## Acceptance

Before a new nutrition record enters the durable queue, validate the canonical database limits: description at most 280 Unicode code points, protein/carbohydrate/fat at most 99999.9 grams, non-negative integer calories at most 2147483647, and optional integer meal slot 1–32767. All supplied macros must be finite and non-negative, and calories or a core macro must be present. Quick Add shows validation errors and retains input; every parsed occurrence, including later duplicates, is range-checked. Invalid entries are rejected without truncation or modifying already pending records. These are storage bounds, not recommended intake values.

After validating original quantities, new intake core macros are rounded to the existing database's tenths of grams and calories to whole kcal. Quick Add previews the same rounded values that are queued. Food-catalog snapshots may retain their supported two-decimal precision; new intake rounds at capture, not after cloud acknowledgement. Existing persisted/pending/historical values are never normalized during hydration or reads. A user-entered 0.01g appears as 0g at intake precision; 0.15g appears as 0.2g. Invalid or out-of-range original values still fail before rounding.

- [ ] Log a food offline, force quit/reopen, reconnect, and verify one matching server row plus the correct coach summary.
- [ ] Retry after a committed response is lost; values and original day remain unchanged without duplicates.
- [ ] Edit a food catalog value and confirm older intake values remain stable.
- [ ] Create more than 50 entries for one day; displayed totals match the complete dataset.
- [ ] Exercise invalid/negative inputs, account switching, failed reads/writes, and corrections with visible recovery.
- [ ] Verify the intended quantity, unit, rounding, meal-slot persistence, edit/delete, and historical date behavior; unmet cases remain open.
- [ ] If plan assignment is implemented, save as coach, reopen as trainee, compare exact plan/targets, and deny unrelated access.

## Proposed computation seam and decisions

Keep model perception separate from deterministic computation: validate a structured estimate, reconcile grams/servings, resolve foods, apply sanity/uncertainty checks, and compute totals before review/logging. Portable donor concepts (`core-schema`, `gram-engine`, `resolver`, `clamp`, `confidence`, `totals`, `goals`) are design inputs, not installed packages. Preserve TRACE's navigation, ownership, media, and durable writes.

Choose the food dataset/license/source, serving conversion policy, coach versus adaptive-target authority, coach visibility, and AI funding/data routing before implementation. Targets may use deterministic formulas; adaptive targets must not silently replace coach prescriptions. Barcode scanning remains excluded unless explicitly reconsidered. Performance work follows [architecture evolution](../planning/architecture-evolution.md).
