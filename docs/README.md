# TRACE Documentation

Central index for all TRACE architecture, product, audit, and specification documents. Start here.

## Map

| Document | Type | Purpose |
| --- | --- | --- |
| [architecture](trace_architecture.md) | Reference | Technical architecture — responsive partitioning, the coach page builder, offline sync, and the RAG pipeline. |
| [features](trace_features.md) | Reference | Product-level view of what each role can do and the core UX features. |
| [audit](audit.md) | Assessment | Current implementation-vs-spec gap analysis and the executive technical recommendations to reach a fully functional build. |
| [specs/offline-sync-outbox](specs/offline-sync-outbox.md) | Spec | Offline session-logging outbox that flushes to Supabase on reconnect. |

## Reading order

1. **New to TRACE?** Read [features](trace_features.md) (what it does) then [architecture](trace_architecture.md) (how it's built).
2. **Picking up implementation?** Read [audit](audit.md) first — it states what is and isn't built today and the recommended technical path — then the relevant [spec](specs/).
3. **Building offline sync?** Go straight to [specs/offline-sync-outbox](specs/offline-sync-outbox.md).

## Status legend

Throughout these docs, features are tagged:

- **Built** — implemented and wired into the running app.
- **Scaffold** — code exists but is not mounted, or runs on mock data.
- **Spec** — described in the architecture doc but not yet implemented.
