# Documentation sources and consolidation

Status: provenance register for the maintained documentation set. Owner: TRACE maintainers. Date: 2026-10-31, Asia/Singapore. Scope: both application READMEs, project docs, agent instructions, and the R2 function README. Thesis/revision research files and unrelated working-tree changes are outside this application-documentation cleanup.

## Attribution and evidence

The project owner's architecture/documentation discussion supplied the proposed performance/shared-AI direction, agent workflow and organization. Existing repository documentation and inspected source supplied platform constraints and procedures. The user-provided diagnosis supplied its dated findings/test evidence; those are attributed records rather than newly performed tests. Documentation was drafted/consolidated with AI assistance. Named human authors were not supplied; maintenance ownership belongs to TRACE maintainers rather than an invented approver.

Code truth remains in manifests, migrations, functions and tests. New dependency versions/provider availability/cloud settings were not verified by editing prose. Technical references are linked beside the relevant recommendations. Recommendations and requirements are distinguished from deployed behavior.

## Where retained material lives

- [Current architecture](architecture/overview.md), [shared contract](architecture/client-contract.md), [offline contract](architecture/offline-sync.md), and [decisions](architecture/decisions/0002-shared-platform.md) own system behavior/rationale.
- [Feature specifications](features/README.md) own requirements and acceptance; [open decisions](planning/open-items.md) and [product scope](planning/product-vision.md) own unresolved choices/candidates.
- [Diagnosis](qa/diagnosis-2026-10-31.md) retains substantive latest findings/evidence. [Android baseline](../../TRACE-client/docs/releases/android-testing-baseline.md) and [reference provenance](research/reference-provenance.md) retain useful dated observations.
- [Workflow](development/workflow.md), [templates](templates/README.md) and both root AGENTS files govern new changes. Operations/QA documents own repeatable procedures.

Older audits, competitor TODOs, handoffs, duplicate recovery compilations, and the temporary diagnosis input are removed after their useful material is incorporated. Their prior source paths/hashes below provide attribution and distinguish inputs; they are not links to files that should still exist. Committed history, when available, remains in Git. Previously untracked originals have no guaranteed Git recovery copy after owner-authorized deletion. No duplicate full-text archive is retained.

## Input fingerprints

SHA-256 values identify the exact working-copy input bytes before this consolidation, including pre-existing edits. They do not prove those files were committed or deployed.

| Input source | SHA-256 | Disposition |
| --- | --- | --- |
| `TRACE/README.md` | `2f4bb5fc4ea30c9ae97632ccf6342e172964011b5074f6dd869d7ab8ba986974` | Revised in place as maintained guidance/evidence; ownership and current navigation supplied. |
| `TRACE/docs/architecture/client-contract.md` | `b0d7af829e51df2ee90f53c0e631a4ab7a0e5976577f01e723d61687671140fa` | Revised in place as maintained guidance/evidence; ownership and current navigation supplied. |
| `TRACE/docs/architecture/decisions/0001-media-storage.md` | `1050045aa102b856a8c1f90459f97bf7d789c9cc3dae32388eeaf69dbf7348ad` | Revised in place as maintained guidance/evidence; ownership and current navigation supplied. |
| `TRACE/docs/architecture/offline-sync.md` | `cfa6fe77df9c4dd610949e6da0c457a6456e239af6e346fbeb04e9f84247a99d` | Revised in place as maintained guidance/evidence; ownership and current navigation supplied. |
| `TRACE/docs/architecture/overview.md` | `a8823fe1c2fa04db31aa7e26896d8935bfd874ea68c775b874f56dbfaef33807` | Revised in place as maintained guidance/evidence; ownership and current navigation supplied. |
| `TRACE/docs/cleanup/2026-10-31-documentation-review.md` | `b318e08626434bad48d7570cac8eaca306d0d199ba2402218a792f33ba079041` | This source register and maintained index; old editorial/recovery instructions retired. |
| `TRACE/docs/compiled/TRACE-architecture-and-planning-originals.md` | `13a2324ddedcc7b65da71401c1767792b1ac4c5cdf377da8aebd1ac4c2aaea8e` | Maintained specs/contracts/decisions; original-text recovery archive removed by owner request. |
| `TRACE/docs/history/coach-audit.md` | `556f350b96ab64ba1d6db0645e40b4f3fc57b315c9fc3e79d23821445c9e291f` | Diagnosis, feature specs, open decisions; older completion claims superseded. |
| `TRACE/docs/operations/backend-provisioning.md` | `672b6e878e01a3c2d4614dbb63e62966312293ba2d064ef7df19ffefd3fa1467` | Revised in place as maintained guidance/evidence; ownership and current navigation supplied. |
| `TRACE/docs/operations/cross-app-rollout.md` | `bee60fabf1edb9619b39d2fdcd2b7517c468ad69e78c0364fee58d2ef8197538` | Revised in place as maintained guidance/evidence; ownership and current navigation supplied. |
| `TRACE/docs/operations/web-deployment.md` | `d7204854bfb94166d037284716ce5baa54ad8ce1c5daab877362b7d5199d33b9` | Revised in place as maintained guidance/evidence; ownership and current navigation supplied. |
| `TRACE/docs/planning/open-items.md` | `5735fb49f7a661a831f20b33816e0ca473917edbc01ced456ab9c62c9a7918ed` | Revised in place as maintained guidance/evidence; ownership and current navigation supplied. |
| `TRACE/docs/planning/product-vision.md` | `145ea7e39e1284a300b4e2521521ac65906f2b7c9514f8b1011f311b8a1e4668` | Revised in place as maintained guidance/evidence; ownership and current navigation supplied. |
| `TRACE/docs/project-overview.md` | `169e14097bb93e9ed79b9a41522c0d4c0fe90f62ea598abd757d7c9653932f87` | Revised in place as maintained guidance/evidence; ownership and current navigation supplied. |
| `TRACE/docs/qa/cross-app-acceptance.md` | `9c0a05fb0623c4ae1a5c184b59ee95846204a392fa8b8203cd38c430fee19f4f` | Revised in place as maintained guidance/evidence; ownership and current navigation supplied. |
| `TRACE/docs/README.md` | `5fff2bcb02a162973a7ee740af24a3641cdcc3f02c674636c17efc4fc3ff1fd4` | Revised in place as maintained guidance/evidence; ownership and current navigation supplied. |
| `TRACE-client/README.md` | `eb938a355b606df4dee292b8508a7c09c63273f6f24ececca2fd04906d0b12d6` | Revised in place as maintained guidance/evidence; ownership and current navigation supplied. |
| `TRACE-client/docs/development/ai-copilot.md` | `3d7cddaa9c7943203d09319a85adcf1c178674b6927291e5944cf6c65efd25a3` | Revised in place as maintained guidance/evidence; ownership and current navigation supplied. |
| `TRACE-client/docs/development/local-preview.md` | `13be3e2b9bc81b311b2c38c6dfdbaa391aea6833b98e4ae892a7984d5c4c0504` | Revised in place as maintained guidance/evidence; ownership and current navigation supplied. |
| `TRACE-client/docs/feature-research/competitor-gap-analysis.md` | `6a670a4a86f561b5c4fcbeb1e37cbd8c4359b96d604814db40217747390fe5cd` | Product scope and open decisions; unsupported parity/shipped claims removed. |
| `TRACE-client/docs/feature-research/tracked-app-parity-gap.md` | `8587479c7156c864d90346a21b28137b6262ef5d38d805285b47f43628fdf547` | Product scope and open decisions; unsupported parity/shipped claims removed. |
| `TRACE-client/docs/planning/nutrition-integration.md` | `8c288a5fc2aa6c5df6849bd56c8fec3ec52c1615aa2e6c0659ebc66c8f6f16ba` | Shared nutrition specification; donor concepts retained as proposals. |
| `TRACE-client/docs/qa/mobile-acceptance.md` | `f30827085846013f91f14e4d7641776ea46d8f61ceadab2d56f143ae67651065` | Revised in place as maintained guidance/evidence; ownership and current navigation supplied. |
| `TRACE-client/docs/qa/test-account.md` | `d4de6be4308ab123ea9beff207e5f84b23ad8a60c6ed8174bedf78c28b673dde` | Revised in place as maintained guidance/evidence; ownership and current navigation supplied. |
| `TRACE-client/docs/README.md` | `63604f4655cf43f7a3f9a7e4c40175fbca9fee76841dfcc06ac8e34b3a3961aa` | Revised in place as maintained guidance/evidence; ownership and current navigation supplied. |
| `TRACE-client/docs/releases/android-2026-10-23.md` | `33d3e0aabce3cb039c620e6069cd62921743220b015528aae0a814c19b97a78a` | Android testing evidence baseline; unstable local URLs removed. |
| `TRACE-client/docs/research/recovered-reference-map.md` | `c60dce1fa3c773450de9563787b1bd559f35ad117b49a5fffd26cbf5967a9d53` | Research provenance; independent acceptance requirements retained. |
| `TRACE/latest diagnosis.md` | `c184214f1f1e47df309b5db63b96aeb37c6e1554e655b8f925774142f31f6918` | Incorporated into the dated diagnosis with all 25 findings; temporary root input removed. |
