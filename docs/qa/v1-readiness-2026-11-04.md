# Initial version-one readiness: 4 November 2026

Status: **private pilot selected; local verification passed; release blocked by implementation and native/staging gates**. Owner: TRACE maintainers / production coordinator. Scope: current dirty coach web and trainee mobile checkouts, not a deployed system. Sources: inspected routes/configuration, existing feature contracts, resumed specialist reviews and the local verification record below.

## Decision

The existing TypeScript/PostgreSQL architecture can support an initial version. A replacement architecture is not required to begin delivery. The current checkout cannot yet be accepted as a complete coaching V1: the routed private workout library has no assignment action, private-media entitlement remains unsafe, and authenticated backend/native acceptance has not been established.

The owner selected a **private pilot with selected coaches and trainees** on 4 November. A local demonstration, invited pilot, and public/store release have different acceptance boundaries. Completing a build establishes none of the latter two by itself. Specific feature exclusions still need to be explicit; selecting a pilot does not silently remove core assignment or security requirements.

## Source identity and current verification

| Checkout | HEAD ancestry | Actual source boundary |
| --- | --- | --- |
| TRACE | `06675347e6b13085750cf319c3b66ffde4a6954e` | Dirty `codex/edge-cors-contract`; includes uncommitted application/backend/docs changes |
| TRACE-client | `774ab9df80d423d76f4d5d5c134ba731d10339a9` | Dirty `codex/trace-reliability`; includes later account, workout-draft, dashboard and nutrition changes |

Current local verification ID: `trace-20261104-160348-sgt`. Logs/manifests are outside both repositories at `C:\Users\imint\.codex\local-verification\trace-20261104-160348-sgt`. The initial paired selected-source SHA-256 is `5013f29ed5b66c5254398f3c369f4efe7e027c196eac349e778cd411c5f212de`; before/after fingerprints and the final verifier report must establish its stability. QA/planning coordination documents, secrets, dependencies, generated artifacts and unrelated thesis work are excluded from that selection.

The current run completed at **16:07:20 SGT** with selected-source fingerprints stable: **597 web tests, 412 mobile tests and 16 SQL scenarios passed**, as did web lint/build, generated types for both apps, contracts, mobile typecheck and documentation checks. Five existing lint warnings and the bundle-size warning remain. See the external `results.json`, `verification.json` and before/after source manifests for commands, timestamps and log hashes. The verification helper's initial output-path quoting and Windows Unicode logging errors are retained; the corrected wrapper completed the interrupted build/check sequence without changing source or rerunning successful checks. The web build used deliberate fixture backend configuration; it is not a deployment artifact for the pilot.

The [1 November archived candidate](local-candidate-2026-11-01.md) remains historical and unchanged. Neither its fixture backend compilation nor its earlier passing checks certify today's bytes or a live deployment.

## Minimum useful coaching V1

The intended acceptance journey is: an authorized coach signs in, invites/links a trainee, saves a workout, assigns it, the trainee opens the exact prescription, durably logs sets and food, reopens after termination, reconnects, and the permitted coach can review the resulting records. Another account must be denied throughout.

| Area | Current implementation boundary | Required before accepting the affected V1 path |
| --- | --- | --- |
| Identity and onboarding | Auth/profile/coach-claim code exists; the first coach requires deliberate privileged bootstrap | Verify real coach/trainee sign-in, claim, sign-out/reopen, role mismatch and unrelated-account denial in the selected environment |
| Coach workout library | Actual `/workouts` creates, atomically saves and reloads ordered private prescriptions | Hosted RPC/save/reload/retry acceptance; deploy the compatible additive RPC before dependent web |
| Assignment delivery | `/workouts` explicitly says assignment unavailable; mobile reads its assigned/owned active templates | Choose fixed-copy versus live semantics, implement one durable authorized assignment journey, verify exact recipient content and preserved performed history |
| Mobile workout logging | Session/set outbox and account/template-keyed active-draft persistence exist | Real-device force-quit/reopen, offline cached workout, parent-before-child delivery, lost-response retry and account isolation |
| Nutrition | Logging, validation, pending local records and daily totals have implementation/tests | Native SQLite persistence/retry, real synchronization, historical values and correct date/day boundaries; saved-meal batch/restart issues remain distinct |
| Coach review | Roster/analytics and related read paths exist | Verify authorized coach sees delivered known records/values; a dashboard total alone does not establish detailed review UX |
| Private media | URL issuance still trusts writable key references instead of trustworthy upload ownership | Ownership/attachment enforcement, legitimate owner/current-coach access, former-coach denial of new URLs, foreign-key tests and supported upload/playback kinds |
| AI, push, calendar/program/nutrition-plan/vault bridges | Mixed placeholder, metadata-only, configuration-dependent or incomplete paths | Defer explicitly from a pilot or implement/accept separately; do not advertise them as working V1 features |
| Public distribution | Mobile config still uses `com.anonymous.traceclient`; no accepted signed native candidate | Decide identity/distribution, validate signing/configuration/privacy destinations, and test exact native artifacts before public/store acceptance |
| Operations | Procedures exist; restore/monitoring evidence is unverified | Name the release/incident owner, identify deployed schema/functions, demonstrate backup/restore access and retain pending local records during recovery |

## Approved decisions and remaining gates

The owner approved all three choices on 4 November:

1. Private pilot with selected coaches and trainees.
2. **Fixed-copy assignment**; future changes require an explicit update. A later source edit must not silently alter an assigned prescription or performed history.
3. **Block new viewing links for legacy media without trustworthy ownership** until ownership is verified or the user reuploads. Preserve historical records; do not invent ownership or delete pending data. Hiding a media button does not secure an otherwise reachable signing endpoint.

Already approved: the **current coach may view historical standalone form-check submissions**; a former coach loses newly issued viewing links when the relationship ends. Previously issued bearer links expire normally. This policy is not yet an implemented entitlement repair.

Shared AI funding/provider/credential/data-routing/retention choices remain separate. Advanced AI, Redis, new infrastructure and competitor feature parity are not prerequisites to deterministic core logging.

## Fresh source-review findings and current work

The media reviewer confirmed D01 still affects both set-video references and editable avatar references. Standalone form checks still use submission-time coach identity in RLS/coach reads, which does not implement the approved current-coach historical-access policy. Progress-photo kind/playback and actual-object finalization remain separate gaps. These are current source findings, not newly exercised live exploits.

The mobile reviewer confirmed an occurrence ambiguity in `recoverQueuedSets`: matching only exercise ID plus set number can restore the same queued log into repeated exercise occurrences. The coordinator independently inspected that helper and its tests. A narrow repair is authorized to use persisted per-occurrence log identities and preserve account/session/template isolation without discarding pending records.

Other mobile findings remain tracked separately: no persistent active-workout navigation entry point for an offline non-default selection; prescribed rest is not passed through to the fixed rest timer; nutrition input can exceed server length/numeric constraints; saved-meal partial creation/retry and catalog pagination remain incomplete. Coach analytics expose aggregate counts and per-entry average calories, not comprehensive daily adherence. These source observations are not native-device reproductions.

Current reservations: Media authorization owns the new canonical media migration, attachment/URL checks, affected coach form-check query and generated types. Original UI owns only the repeated-exercise draft-recovery repair and mobile tests. Workout authoring prepares the fixed-copy assignment implementation read-only until schema ownership transfers from Media. Release acceptance has completed the stable local baseline. The coordinator owns this readiness record and navigation; no competing application writer or live action is authorized.

## Delivery sequence

1. Preserve the completed local baseline and finite source reviews. Repair the demonstrated repeated-exercise recovery issue; record its newer source/test boundary separately.
2. Implement media security under the approved legacy/current-coach policies, then transfer schema ownership for one fixed-copy assignment journey. Keep one canonical schema/type writer and preserve released-client compatibility.
3. Run changed-path regressions and required paired checks; freeze an identified candidate only once its selected sources stabilize. Retain the earlier candidate's identity separately.
4. With explicit staging authorization and dedicated fixtures, verify two coaches/two trainees through actual Auth/data API/Edge/R2 transports. Record deployed migration/function versions. Local PGlite/mocks do not satisfy this step.
5. Test the exact native pilot artifact: sign-in/coach link, cached workout, food/set saves, force-quit/reopen, reconnect, deduplicated coach visibility, and account switches. Record device/OS/build identity and failures.
6. Approve the named release boundary and execute the [cross-app rollout](../operations/cross-app-rollout.md). Source preparation does not authorize live migration, deployment or publication.

## Evidence and limits

The resumed Release acceptance chat owns sequential web/SQL/types/contracts/mobile verification. Media authorization reviews security/media read-only; the original UI chat reviews mobile journeys read-only. No application source has been changed by this diagnosis. Tests, source review, fixture builds, actual authenticated acceptance and deployment are tracked separately. Linked earlier [diagnosis](diagnosis-2026-10-31.md) findings remain historical until superseded by specific current evidence; the [implementation board](../planning/implementation-board.md) records prior completed repair scopes.
