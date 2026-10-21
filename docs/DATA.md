# Historical-data plan and current coverage

Current coverage: a small, clearly labeled development fixture only. It is sufficient for local gameplay and tests and must not be described as NBA history.

The intended importer input is NBA Stats game box-score data, where a team-game roster has stable player identifiers. An edge is emitted only when two distinct players occur in the same team/game roster. This implements the product's regular-season/playoff co-appearance rule and avoids false team-season joins. Before production use, confirm NBA Stats terms, access terms, and redistribution permissions; do not commit restricted raw source data.

Suggested source: [NBA Stats](https://www.nba.com/stats/) (accessed 2026-10-20). It is a live service rather than a licensed bulk historical archive, so coverage, season range, rate limits, and redistribution rights remain a deployment blocker. The importer must record source URL, retrieval date, checksum, failures, excluded game types, and produced coverage.

`scripts/import_nba.py` is intentionally a safe artifact validator/template: it does not scrape a live service. Feed it normalized cached game-roster JSON only after a source review. It preserves the last artifact on validation failure.
