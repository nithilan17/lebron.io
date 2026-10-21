# Build lebron.io — a daily NBA teammate connection game

You are working in an almost empty repository containing only `.venv/` and `.gitignore`. Build a complete, polished, production-oriented full-stack application called **lebron.io**. Implement the application, data pipeline, tests, and deployment documentation; do not stop at a plan or mockup.

## Product

Every day, everyone receives the same NBA target player. Starting at **LeBron James**, the player builds a chain of real NBA teammates until reaching that target.

- Play in one direction only: LeBron → teammate → teammate → daily target.
- Each connection counts as one move. A chain of four players has three connections.
- Any valid chain reaching the target wins. Finding a shortest path earns an “Optimal” distinction.
- Allow unlimited undo while playing. Undo removes the last player; LeBron cannot be removed. Do not allow repeated players in a chain.
- No timer, accounts, multiplayer, leaderboard, or player photos in v1.
- Track optional hints separately from connection count.
- After winning or giving up, show one globally shortest LeBron-to-target solution, including the team and season evidence for each edge.
- Give up requires confirmation, reveals the answer, and permanently marks that day's puzzle as given up in that browser.
- Completed games are locked. Refreshing or reopening cannot reset the result or allow another submission through ordinary UI use.

## Stack and deployment

Use Next.js App Router, TypeScript, React, Tailwind CSS, and server-side route handlers, deployable as one Vercel project. Choose current compatible stable dependencies after checking their official documentation. Commit a lockfile.

Use Python scripts in the existing virtual environment for historical data ingestion if useful; gameplay must not require a persistent Python server. Do not delete or commit `.venv`.

Prefer a compact, versioned graph artifact loaded on the server. A hosted database is optional only if measured size or deployment constraints justify it; do not introduce paid infrastructure unnecessarily. Never depend on writing to the deployed filesystem or on a long-lived process. Document actual artifact size, loading behavior, and relevant Vercel constraints. Keep the full graph and unrevealed solutions out of client bundles.

## Historical data: accuracy is a core requirement

Aim to support every historical NBA player covered by a verified, accessible data source. Research sources before choosing one. Document source URLs, retrieval dates, usage/redistribution restrictions, league coverage, season range, exclusions, and refresh instructions. Do not claim complete NBA history unless verified.

**Default teammate rule:** two players qualify if both appeared in the same official NBA regular-season or playoff game for the same team. This provides verifiable overlap and prevents a season-only join from incorrectly connecting players traded for each other. It excludes roster-only overlap where the players never appeared together; explain this rule briefly in Help.

- Exclude opponents, All-Star games, preseason, Summer League, college, international/national teams, and ABA-only records from v1.
- Never infer an edge solely from a shared team-season row. Never fabricate relationships or evidence.
- Use stable player IDs; names are labels, not primary keys. Handle duplicate names, suffixes, accents, name changes, traded players, and franchise relocations.
- Store an undirected edge with all verified shared team-season combinations and at least one supporting game ID/date per combination. Deduplicate records and coalesce consecutive display seasons only within the same franchise/team context.
- Use conventional season labels such as `2015–16`, not ambiguous calendar-year labels.
- Record a dataset version and checksum. Validate references, edge symmetry, duplicates, missing evidence, and connected components.
- Build and cache the graph offline. Do not scrape or call third-party NBA services on every gameplay request.
- Use resumable ingestion with caching, sensible rate limits, retries, and explicit error reporting. Preserve the last valid artifact if ingestion fails.
- If accessible historical data cannot support the full target scope, build a clearly labeled verified subset plus a complete importer. Report the precise blocker and coverage. A small synthetic fixture is acceptable for tests or explicit demo mode only; never present it as production history.

## Daily puzzle generation

- One global puzzle per calendar day in `America/New_York`, switching at midnight there and respecting daylight saving time.
- The server is authoritative for the puzzle date; do not use the user's local timezone to choose a target.
- Generate a deterministic, versioned schedule ahead of time from the verified graph. No request-time random targets or required daily cron.
- Exclude LeBron, unreachable players, and targets with shortest distance outside 3–5 connections for the initial schedule. If too few eligible targets exist, report this instead of silently relaxing the rule.
- Avoid repeating targets within the generated schedule where possible. Document the schedule horizon and return an explicit unavailable state if exhausted.
- Pin each puzzle to its graph version so later data updates cannot change an existing puzzle or invalidate saved progress.
- Compute distances and one reproducible shortest path with breadth-first search. Deterministic tie-breaking is sufficient; do not enumerate all shortest paths.
- Include a stable puzzle ID, target, date, graph version, and next reset timestamp in the puzzle response. Do not disclose the optimal length or path before completion.

## Gameplay and autocomplete

The screen should prominently show LeBron as the starting point, the daily target, the current chain, and a search field labeled “Who was [current player] teammates with?”

- Query only eligible neighbors of the current endpoint; never restrict the graph itself to the first few players.
- Return up to 8 ranked matching players. Match names case-insensitively and accent-insensitively, with sensible exact/prefix/token ranking and deterministic ties.
- With an empty query, show up to 8 eligible suggestions in a neutral stable order. Typing must make every eligible teammate discoverable.
- Never rank ordinary suggestions by distance to the target or disclose whether a suggestion is strategically useful.
- Show player name plus compact verified shared team/season evidence in suggestions.
- Support keyboard navigation, Enter, Escape, touch, focus management, loading, empty results, and errors through an accessible combobox/listbox.
- Debounce searches and cancel or ignore stale responses, including responses for a previous endpoint after undo or selection.
- When selected, validate the edge server-side before appending it. Show the connection's team and seasons between player cards; allow expansion for multiple shared teams/seasons.
- Keep search usable for long historical names and players with many teammates. Input limits must not arbitrarily restrict valid names.
- Provide undo and a confirmed reset of an unfinished chain. Reset never clears hints already used. No reset after a terminal result.

## Optional hints

- A Hint button opens: “Reveal a recommended next player?” Explain that it counts as one hint. Charge only on explicit reveal.
- Reveal one eligible teammate of the current endpoint that reduces the shortest remaining distance to the target by exactly one.
- Compute the path in the graph excluding previously visited players other than the current endpoint, matching the no-repeat rule. If no continuation exists, do not charge a hint; tell the user to undo a move.
- Hints must work after detours. They suggest a player without automatically appending it; the user chooses whether to select it.
- Re-requesting an already revealed hint for the same puzzle and exact chain returns the same hint without charging again. Changing the chain can produce a new charged hint.
- Persist revealed hints and hint count. Undo, reset, refresh, and reopening must not erase their cost.
- Display hints used in the final result and share text. No arbitrary hint cap for v1.

## Saving progress and results

No login: persistence is scoped to the same browser/device using versioned localStorage records. This is a casual game; do not claim cheat-proof scoring or cross-device persistence.

- Save after every accepted move, undo, reset, hint reveal, and terminal result.
- Persist puzzle ID/date, graph version, chain IDs and evidence, status (`playing`, `won`, `given_up`), revealed hints/count, immutable final result, and a schema version.
- Restore before showing a playable board, without hydration flicker or overwriting saved state with defaults.
- Validate restored data against the pinned puzzle/graph through the server. Handle malformed records, schema migrations, unavailable storage, and unavailable old graph versions gracefully. Never silently discard a completed result.
- Stats count terminal outcomes once per puzzle, even across refreshes or tabs: played, won, win percentage, current streak, and best streak. Define streaks by Eastern puzzle dates; a missed day or give-up breaks a streak. Hinted wins still count as wins.
- Synchronize ordinary multi-tab activity using storage events or BroadcastChannel. Treat terminal results as authoritative and prevent a stale playing tab from overwriting them. Document the local-only consistency limits.
- On midnight rollover or returning to a backgrounded tab, preserve/archive the old puzzle and load the current one with a clear “New daily puzzle” notice. Never submit an old chain as today's puzzle.
- If storage is blocked, show a concise notice that progress cannot be saved while allowing play.

## Backend contracts and validation

Implement typed, schema-validated server operations for daily puzzle retrieval, teammate search, move/chain validation, hint revelation, and completion/give-up solution retrieval. Choose clean route names and document request/response shapes.

- Validate puzzle IDs, graph versions, player IDs, query lengths, chain edges, uniqueness, starting player, target, and terminal eligibility.
- Recompute validity and optimal distance server-side; never trust a client-supplied win, edge, score, or path length.
- Hint requests include the current chain. Success and give-up requests include the relevant chain/status intent.
- Only return a full optimal solution after a valid completion or explicit give-up request. Local-only play cannot provide strong anti-cheat guarantees; keep that scope clear.
- Return consistent errors without leaking stack traces. Bound request sizes and work to prevent expensive unbounded traversals.
- Cache immutable graph data safely across warm invocations while remaining correct on cold starts. Cache puzzle metadata only until its actual Eastern reset, or key by puzzle date. Keep personalized chain/hint/result responses out of shared caches.
- Avoid live external dependencies during normal gameplay. Never expose secrets in browser code.

## Visual and interaction design

Make this feel like a polished daily puzzle, not a database dashboard.

- Dark charcoal background, warm orange basketball accents, cream text, and restrained electric highlights.
- Bold athletic typography, generous spacing, subtle court-line motifs, distinctive player cards, and a satisfying chain progression.
- Strong hierarchy: `lebron.io`, daily puzzle date/number, target player, current chain, search, and secondary actions.
- Mobile-first vertical chain with readable connections and comfortable touch targets; adapt intentionally for desktop without requiring horizontal scrolling.
- Small purposeful animations when adding a connection and winning. Respect reduced motion. No excessive glow, distracting background movement, or dependency on player images.
- Include concise How to Play, teammate-rule/data coverage information, stats, and a result panel.
- Use accessible contrast, semantic controls, visible focus, screen-reader status announcements, and accessible dialogs.
- Handle long names, many evidence seasons, no results, slow requests, API failures, and graph-unavailable states with finished UI.

## Completion and sharing

After winning, show connections used, globally optimal connections, hints used, and an Optimal badge when appropriate. Show the player's chain and one optimal chain with evidence. After give-up, show the optimal chain and a clear given-up outcome.

Provide a spoiler-free Copy Result action containing the game name, puzzle date/number, outcome, connection count when won, optimal count, and hints used. Do not include player names or the solution. Handle clipboard failure with selectable text.

Example format (illustrative values, not fixed data):

```text
lebron.io #42
🏀 5 connections · Optimal: 3
💡 1 hint
```

## Verification

Write meaningful automated tests for:

- Graph ingestion and evidence: co-appearing teammates qualify; same-season players without verified co-appearance do not; opponents do not; traded players and multiple team-season evidence work.
- BFS shortest paths, deterministic ties, unreachable targets, connection counting, and hint continuation under the no-repeat rule.
- Suggestion eligibility, complete discoverability through search, name normalization, result caps, and stale-request handling.
- Server rejection of forged edges, repeated players, wrong puzzle/version, invalid starts, and fake completion.
- Eastern midnight and daylight-saving puzzle boundaries; stable targets and graph versions across deployments.
- Persistence across reload, hints surviving undo/reset, terminal result restoration, stats counted once, corruption handling, and stale-tab behavior.

Use unit/integration tests plus focused Playwright flows for a complete win, hint + refresh, undo, give-up + refresh, and responsive keyboard/mobile gameplay. Use deterministic fixture data for tests; do not depend on live network services. Run type checking, linting, tests, and a production build. Inspect the actual UI at mobile and desktop sizes where browser tooling is available. Report checks that could not be run honestly.

## Deliverables and working approach

1. Inspect the repository and preserve existing unrelated files. Briefly state your implementation approach, then build.
2. Verify data feasibility early; document the chosen source and teammate rule before generating production edges. Continue implementing independent app work if data access is blocked.
3. Deliver the working frontend, real server operations, versioned graph/schedule format, reproducible importer, and clearly separated test/demo fixtures.
4. Provide a README covering local setup from this empty repo, required Node/Python versions, commands, environment variables, data acquisition, generated artifacts, coverage, puzzle scheduling, persistence limits, tests, and Vercel deployment.
5. Include `.env.example` if environment variables are required; never commit credentials, `.venv`, or prohibited source data. Explain how deployment obtains any uncommitted artifacts.
6. Add a concise architecture/data-model document and deployment checklist. Do not buy a domain or publish publicly as part of implementation; make the project ready to deploy.
7. Finish with what works, verified historical coverage, checks run, limitations/blockers, and exact commands to launch and deploy.

Make routine implementation decisions autonomously. Prioritize data truthfulness, a complete playable loop, durable browser progress, and a distinctive polished interface. Do not declare the project production-ready if only demo data works.
