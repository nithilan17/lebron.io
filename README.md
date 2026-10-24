# lebron.io

Daily NBA teammate-chain game built with Next.js App Router, TypeScript, React, Tailwind CSS, and server route handlers.

## Run

Requires Node 20+ and npm. Python 3.10+ is only required for offline artifact validation.

```powershell
npm install
npm run dev
```

Then open `http://localhost:3000`. Quality commands: `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.

## Daily roster automation

`make roster-update` runs the prior Pacific-date roster update, rebuilds the graph if new season rows arrive, and lets the existing updater commit and push only `data/generated/graph.json`. It does not commit when the graph content is unchanged. The default interpreter is `python3`; on this Windows setup, use `make roster-update PYTHON='py -3.12'`.

The target is deliberately not scheduled or invoked by this repository. On a Unix host with GNU Make, a once-daily cron entry can be added when ready (replace the path and log path):

```cron
15 9 * * * flock -n /tmp/lebron-roster-update.lock make -C /srv/lebron.io roster-update >> /var/log/lebron-roster-update.log 2>&1
```

The `flock` lock prevents overlapping runs. Before enabling it, run `make roster-update-dry-run` under the same service account and ensure that account has a Git remote with permission to push `main`.

## What is implemented

- Eastern-date deterministic daily puzzle, server-side validated moves, bounded teammate search, no-repeat chains, undo, give-up, shortest-path hints, and solution reveal.
- Versioned browser-local progress, terminal lock in ordinary UI use, and spoiler-free result copying.
- Accessible mobile-first dark court interface and server-only graph operations.
- Fixture graph with supporting game evidence and an offline importer/validator template.

## Data truthfulness

The checked-in graph is a **development fixture**, not complete NBA history. A local, gitignored NBA Stats roster collection now covers 1946–47 through completed 2025–26, but it has not been bundled into the app or released because NBA Stats' terms must be cleared first. See [data documentation](docs/DATA.md) and [game/data rules](RULES.md). Gameplay makes no live third-party calls.

## API

`GET /api/puzzle`, `GET /api/search?endpoint=&q=`, `POST /api/move`, `POST /api/hint`, and `POST /api/solution` are schema-validated. Mutation bodies include `puzzleId`, `graphVersion`, and `chain`; handlers recompute edges and completion.

See [architecture](docs/ARCHITECTURE.md) and [deployment checklist](docs/DEPLOYMENT.md).
