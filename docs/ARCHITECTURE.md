# Architecture

`app/api/*` is the public server boundary. Route handlers validate bounded JSON with Zod; they never trust a client chain, win, or edge. `lib/graph.ts` supplies immutable graph operations: edge lookup, normalized names, and deterministic BFS. The browser stores a versioned record under `lebron.io/v1`, scoped to its device.

## Data model

Each edge is undirected and carries one or more `{team, season, gameId, gameDate}` evidence records. Production artifacts should be emitted as `data/generated/graph.<version>.json` with SHA-256 in an adjacent manifest, then loaded server-only. The fixture presently embedded in `lib/graph.ts` is **not production data**.

The daily schedule is deterministic from an Eastern date and graph version. In a production importer, write a finite schedule artifact, pin date → target → graph version, and return unavailable when its horizon is exhausted.

## Local persistence

Terminal results are immutable in normal UI flow. Browser storage is convenience persistence, not anti-cheat or cross-device scoring. A production follow-up should add `storage`/`BroadcastChannel` reconciliation and archive dated records rather than replacing a single current record.
