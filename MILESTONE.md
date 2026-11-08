# Initial-load performance implementation progress

Last updated: 2026-08-05

- [x] Implementation worker started; unrelated user changes identified and preserved.
- [x] Phase 0: private/no-store middleware, safe duration-only Server-Timing on list API, client marks, measurement guide.
- [x] Phase 1: shared excerpt-only DTO, bounded list/load-more UI, per-ID detail loading.
- [x] Phase 2: validated opaque keyset cursor, page/list/detail store split, dedupe/reset and mutation synchronization, unique homepage.
- [x] Phase 3: bound escaped text AND and multi-tag AND predicates in D1, page-first/tag-second hydration, idempotent index migration and measurement notes.
- [x] Independent final review: fixed owner-switch request races, page-cache tag mutation consistency, per-ID detail loading/error/retry state, bounded search predicates, stricter cursor fields, and added a same-timestamp page-boundary test.
- [x] Validation: API tests (19 pass), unit tests (28 pass), typecheck, production build, diff check.

Current activity: complete after independent review and repair. The final validation suite passed. Build warned about large chunks but completed; no production metrics were fabricated and no remote D1/deploy/commit/push was performed.
