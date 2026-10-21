# lebron.io rules

## Puzzle objective

The daily puzzle is a one-direction chain beginning with **LeBron James** and ending at the server-selected target. Each adjacent pair is one connection. A player may occur only once in a submitted chain. The player may undo to LeBron at any time before a terminal result.

## Definition of teammate

Two players are teammates only when both have a recorded appearance in the **same official NBA regular-season or playoff game**, for the **same team**. Team membership in the same season alone is insufficient. A player-game row must be an actual appearance, not a roster listing, inactive designation, or DNP.

Every edge retains at least one item of audit evidence: stable game ID, game date, stable team ID, team label, season label, and competition type. The graph is undirected; the puzzle chain is directed from LeBron to the target.

## Included and excluded competitions

Included: NBA/BAA regular-season games and NBA playoffs, starting only at the earliest season for which the chosen source returns complete player-game participation with team IDs.

Excluded: opponents, preseason, All-Star games, Summer League, G League, college, international and national teams, and ABA-only records. A post-merger player may be included for NBA appearances; ABA appearances are not.

## Identity, teams, and seasons

Provider player IDs and team IDs are primary keys. Names are display labels only and can change, repeat, contain accents, or gain suffixes. A team ID plus its display name is retained for evidence; franchise relocations are never merged merely by name. Seasons use `YYYY–YY` labels and preserve game date and game type.

## Data quality and release policy

The importer deduplicates player-game rows by `(player_id, game_id, team_id)`, rejects incomplete identifiers, and validates edge symmetry and evidence. A graph release contains a version, retrieval date, source metadata, coverage range, row/edge counts, and SHA-256 checksum. It is not replaced if collection or validation fails.

No source data is committed unless its license permits redistribution. The current application fixture is development-only and is not historical coverage.

## Daily puzzle and scoring

The server selects the date in `America/New_York`. Schedules are generated offline and pin target and graph version. Eligible initial targets are reachable from LeBron at a shortest distance of 3–5 connections. A win is any valid chain reaching the target; a chain equal in length to the globally shortest path receives **Optimal**. Hints are counted separately from connections.
