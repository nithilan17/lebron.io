# Historical-data plan and current coverage

## Collected local roster coverage

On 2026-10-20, the offline collector successfully retrieved a local, gitignored file at `data/raw/nba-rosters-1946-2025.csv`. It has 1,481,744 player-game-team rows, 80 seasons (`1946–47` through completed `2025–26`), dates from 1946-11-01 through 2026-06-13, regular season and playoffs only, and zero duplicate `(player_id, game_id, team_id)` rows. The in-progress 2026–27 season is intentionally excluded.

The file has `PLAYER_ID`, `PLAYER_NAME`, `TEAM_ID`, `TEAM_ABBREVIATION`, `TEAM_NAME`, `GAME_ID`, `GAME_DATE`, `SEASON`, `SEASON_TYPE`, and `MIN`. Grouping actual player-game rows by `(GAME_ID, TEAM_ID)` provides the teammate evidence required by [RULES.md](../RULES.md). This collection is local source material only; it is ignored by Git and does not change the app's checked-in development fixture.

## Source and release constraint

The intended importer input is NBA Stats game box-score data, where a team-game roster has stable player identifiers. An edge is emitted only when two distinct players occur in the same team/game roster. This implements the product's regular-season/playoff co-appearance rule and avoids false team-season joins. Before production use, confirm NBA Stats terms, access terms, and redistribution permissions; do not commit restricted raw source data.

Source: [NBA Stats](https://www.nba.com/stats/) (accessed 2026-10-20). It is a live service rather than a licensed bulk historical archive, so redistribution rights remain a deployment blocker. The importer must record source URL, retrieval date, checksum, failures, excluded game types, and produced coverage. NBA.com's terms restrict comprehensive, regularly updated NBA statistics databases without express consent; do not deploy or redistribute a derived full graph until permission or a suitable commercial license is obtained.

`scripts/download_nba_rosters.py` collects the source rows rate-limited and refuses to overwrite output. `scripts/import_nba.py` is intentionally a safe artifact validator/template: it does not scrape a live service. Feed it normalized cached game-roster JSON only after a source review. It preserves the last artifact on validation failure.

## Local compact graph artifact

For local development, run `npm run build:roster-graph`. It creates the gitignored `data/generated/graph.json` from the cached CSV. The file stores each teammate connection once, with one representative game as evidence; the server expands those pairs into two-way lookups at runtime. It is not sent to browsers. Delete `data/generated/graph.json` to return to the checked-in fixture. Set `GRAPH_ARTIFACT` to load a graph from another local path.
