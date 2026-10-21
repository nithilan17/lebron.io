"""Build a compact, undirected teammate graph from the cached NBA roster CSV.

The output stores each player pair once. It is deliberately not an adjacency
list: the application builds its two-way lookup index in memory, avoiding a
second copy of every connection in the artifact. Each connection also records
the first and last shared season for every team the pair played for together.

Example:
  python scripts/build_roster_graph.py --input data/raw/nba-rosters-1946-2025.csv --output data/generated/graph.json
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import sqlite3
import tempfile
from pathlib import Path

REQUIRED = {"PLAYER_ID", "PLAYER_NAME", "TEAM_ID", "TEAM_NAME", "GAME_ID", "GAME_DATE", "SEASON"}


def source_hash(source: Path) -> str:
    digest = hashlib.sha256()
    with source.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()[:12]


def write_json(connection: sqlite3.Connection, output: Path, source: Path) -> tuple[int, int]:
    version = f"nba-rosters-v2-{source_hash(source)}"
    fd, temporary = tempfile.mkstemp(dir=output.parent, suffix=".tmp")
    players = connection.execute("SELECT COUNT(*) FROM players").fetchone()[0]
    edges = connection.execute("SELECT COUNT(*) FROM edges").fetchone()[0]
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            # Compact tuples keep this local deployment artifact substantially
            # smaller than repeating object property names millions of times.
            handle.write('{"version":')
            json.dump(version, handle, separators=(",", ":"))
            handle.write(',"players":{')
            for index, (player_id, name) in enumerate(connection.execute("SELECT id, name FROM players ORDER BY id")):
                if index:
                    handle.write(",")
                json.dump(player_id, handle, separators=(",", ":"))
                handle.write(":")
                json.dump(name, handle, ensure_ascii=False, separators=(",", ":"))
            handle.write('},"edges":[')
            edge_index = 0
            current: tuple[str, str, str, str, str, str] | None = None
            stints: list[tuple[str, str, str, str, str]] = []

            def write_edge() -> None:
                nonlocal edge_index
                if current is None:
                    return
                if edge_index:
                    handle.write(",")
                json.dump([*current, stints], handle, ensure_ascii=False, separators=(",", ":"))
                edge_index += 1

            rows = connection.execute("""
                SELECT e.a, e.b, e.team, e.season, e.game_id, e.game_date,
                       s.team, s.first_season, s.last_season, s.game_id, s.game_date
                FROM edges e JOIN stints s ON s.a = e.a AND s.b = e.b
                ORDER BY e.a, e.b, s.first_season, s.team
            """)
            for a, b, team, season, game_id, game_date, stint_team, first, last, stint_game_id, stint_game_date in rows:
                edge = (a, b, team, season, game_id, game_date)
                if current is not None and edge != current:
                    write_edge()
                    stints = []
                current = edge
                stints.append((stint_team, first, last, stint_game_id, stint_game_date))
            write_edge()
            handle.write("]}")
        os.replace(temporary, output)
    except Exception:
        os.unlink(temporary)
        raise
    return players, edges


def add_game_edges(connection: sqlite3.Connection) -> None:
    current_key: tuple[str, str] | None = None
    roster: list[tuple[str, str, str, str, str]] = []

    def save_roster() -> None:
        members = sorted({row[0] for row in roster})
        if not members:
            return
        team, season, game_id, game_date = roster[0][1:]
        for left, a in enumerate(members):
            for b in members[left + 1:]:
                connection.execute("INSERT OR IGNORE INTO edges VALUES (?, ?, ?, ?, ?, ?)", (a, b, team, season, game_id, game_date))
                connection.execute("""
                    INSERT INTO stints VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(a, b, team) DO UPDATE SET
                      first_season = MIN(first_season, excluded.first_season),
                      last_season = MAX(last_season, excluded.last_season)
                """, (a, b, team, season, season, game_id, game_date))

    rows = connection.execute("SELECT game_id, team_id, player_id, team, season, game_date FROM rosters ORDER BY game_id, team_id, player_id")
    for game_id, team_id, player_id, team, season, game_date in rows:
        key = (game_id, team_id)
        if current_key is not None and key != current_key:
            save_roster()
            roster.clear()
        current_key = key
        roster.append((player_id, team, season, game_id, game_date))
    save_roster()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if not args.input.is_file():
        parser.error(f"missing CSV: {args.input}")
    if args.output.exists():
        parser.error(f"refusing to overwrite existing output: {args.output}")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    database = args.output.with_suffix(args.output.suffix + ".sqlite.tmp")
    if database.exists():
        database.unlink()
    connection = sqlite3.connect(database)
    try:
        connection.executescript("""
            PRAGMA journal_mode=OFF;
            PRAGMA synchronous=OFF;
            CREATE TABLE players (id TEXT PRIMARY KEY, name TEXT NOT NULL) WITHOUT ROWID;
            CREATE TABLE edges (
              a TEXT NOT NULL, b TEXT NOT NULL, team TEXT NOT NULL, season TEXT NOT NULL,
              game_id TEXT NOT NULL, game_date TEXT NOT NULL, PRIMARY KEY (a, b)
            ) WITHOUT ROWID;
            CREATE TABLE rosters (
              game_id TEXT NOT NULL, team_id TEXT NOT NULL, player_id TEXT NOT NULL,
              team TEXT NOT NULL, season TEXT NOT NULL, game_date TEXT NOT NULL,
              PRIMARY KEY (game_id, team_id, player_id)
            ) WITHOUT ROWID;
            CREATE TABLE stints (
              a TEXT NOT NULL, b TEXT NOT NULL, team TEXT NOT NULL,
              first_season TEXT NOT NULL, last_season TEXT NOT NULL,
              game_id TEXT NOT NULL, game_date TEXT NOT NULL,
              PRIMARY KEY (a, b, team)
            ) WITHOUT ROWID;
        """)
        with args.input.open(encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            if not reader.fieldnames or not REQUIRED.issubset(reader.fieldnames):
                raise ValueError("CSV is missing required NBA roster columns")
            for row in reader:
                if not all(row.get(key) for key in REQUIRED):
                    raise ValueError("CSV contains a row without player, team, game, date, or season identity")
                connection.execute("INSERT OR REPLACE INTO players (id, name) VALUES (?, ?)", (row["PLAYER_ID"], row["PLAYER_NAME"]))
                connection.execute("INSERT OR REPLACE INTO rosters VALUES (?, ?, ?, ?, ?, ?)", (row["GAME_ID"], row["TEAM_ID"], row["PLAYER_ID"], row["TEAM_NAME"], row["SEASON"], row["GAME_DATE"]))
        add_game_edges(connection)
        connection.commit()
        players, edges = write_json(connection, args.output, args.input)
        print(f"wrote {args.output}: {players:,} players, {edges:,} undirected connections")
    finally:
        connection.close()
        if database.exists():
            database.unlink()


if __name__ == "__main__":
    main()
