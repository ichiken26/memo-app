# Initial-load performance measurement

No production measurements are recorded in this repository. Establish a baseline and compare changes using the same account dataset, browser version, viewport, network profile, and CPU throttling. Run at least five cold-load samples and report median, p75, and p95; never mix local and production results.

1. In Chrome Network, preserve the `/api/memos` and `/api/tags` request start, TTFB, download, transfer size, and resource size. Confirm `Cache-Control: private, no-store` and inspect `Server-Timing` (`auth`, `db`, `map` when applicable, and `total`). The values contain durations only—never UID, authorization, search text, or memo content.
2. In Performance, record authentication readiness through the `memo-list-load-start` and `memo-list-load-end` marks. Inspect JSON work, Vue updates, style/layout/paint, and long tasks under normal and throttled profiles.
3. Record memo count, aggregate body bytes, and memo/tag relationship count for synthetic or explicitly approved datasets. Do not copy private body text into reports.
4. Inspect build route chunks and browser Coverage. Record Lighthouse LCP/TBT under identical conditions and retain raw reports with environment metadata.
5. Use local D1 fixtures to run `EXPLAIN QUERY PLAN` for list/search/tag queries before changing indexes. Apply `migrations/0001_initial_load_indexes.sql` locally and compare plans and rows read/returned. Remote D1 must only be measured through an independently authorized operational procedure.

Acceptance checks: list pages contain at most 30 unique IDs; serialized list items have no `body` key; same-timestamp boundaries neither repeat nor skip fixture rows; multi-word and multi-tag filters use AND semantics; owner predicates are present in every query.
