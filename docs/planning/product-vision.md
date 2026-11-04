# Product scope and candidate ideas

Status: product direction and unapproved candidates. Owner: TRACE maintainers. Updated: 2026-10-31. Sources: owner discussion, earlier feature catalog, August competitor research, and October reference notes, consolidated with provenance in [sources](../sources.md). Public competitor claims and effort estimates were not freshly researched.

## Core direction

Reduce effort to log food and training while giving coaches reliable plans, review queues, progress summaries, and communication. Favor large touch targets, previous-session context, useful offline reads, recoverable input, explicit synchronization state, and reusable coach authoring. AI assists rather than silently replacing coach prescriptions or deterministic accounting.

The maintained requirements are the [feature specifications](../features/README.md). Known implementation gaps are in the [diagnosis](../qa/diagnosis-2026-10-31.md). A candidate below is not a task commitment or evidence that TRACE lacks/implements it.

## Retained candidates

| Area | Ideas to evaluate | Decision constraints |
| --- | --- | --- |
| Training | Plate calculator, supersets/drop sets, warm-up exclusions, failed sets, duration sets, rep-range PRs, phase planning | Inspect existing schema/UI first; define metric semantics, grouping/rest behavior, units and atomic edits |
| Nutrition | Weekly comparisons, fiber/sugar/net-carb views, water summaries, recipe URL import, better photo review | Food licensing/provenance, safe URL ingestion, serving validation, coach target authority |
| Recovery | Sleep debt, readiness/fatigue summaries, wearable import | Explain uncertainty; do not imply clinical accuracy or equivalence to HRV-based systems |
| Coaching | Scheduled delivery, targeted resources, adaptive draft programs, periodic reports | Complete current assignment/media flows first; preserve coach approval and ownership |
| Social | Feed/reactions, clubs, route/segment rankings | Privacy, moderation, location sensitivity, and clear user value before new infrastructure |
| Device UX | Gym-specific exercise/equipment availability, progress comparison, history import | Gyms may mean equipment overrides rather than a location directory; specify before modeling |

A rule-based load suggestion is not AI. Manual past-date weigh-ins are not file import. Manual steps are not Health/Health Connect ingestion. Existing custom foods/water/check-ins/tags must be inspected before treating old competitor gaps as missing work.

## Retained scheduling and alert proposals

Template scheduling once proposed `start date + 7 * (week - 1) + (day - 1)`. It needs timezone, rest-day, recipient, rescheduling and plan-version semantics. Missed-session/biometric/RPE alert thresholds remain proposals; the existing 21-day workout-based churn rule measures a different outcome. Avoid presenting them as one verified alert policy.

## External research provenance

Prior notes considered Tracked, WHOOP, Strava, MyFitnessPal, Hevy and Fitbod. The Tracked notes cited its [marketing site](https://www.tracked.gg/), [App Store listing](https://apps.apple.com/us/app/tracked-strength-training/id6450913418), and [Play listing](https://play.google.com/store/apps/details?id=com.tracked.mobile). Those sources describe marketed behavior, not TRACE acceptance or recovered server behavior. Selected reference-analysis details are retained in [research provenance](../research/reference-provenance.md). No full-app parity is claimed.

Existing exclusions and unresolved choices are in [open items](open-items.md); performance and shared AI are in [architecture evolution](architecture-evolution.md).
