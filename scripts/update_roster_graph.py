"""Fetch yesterday's roster rows and rebuild the graph only when the season grows.

Designed for a daily scheduler. It writes transient downloads and its checkpoint
to data/cache/ (which is gitignored), keeps the season CSV as the local source
of truth, and atomically replaces data/generated/graph.json after a successful
build.

Example:
  python scripts/update_roster_graph.py
  python scripts/update_roster_graph.py --date 2026-10-20
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import subprocess
import sys
import tempfile
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
CACHE = ROOT / "data" / "cache"
GENERATED = ROOT / "data" / "generated"
STATE = CACHE / "roster-update-state.json"
IDENTITY = ("PLAYER_ID", "GAME_ID", "TEAM_ID")


def season_start(day: date) -> int:
    return day.year if day.month >= 10 else day.year - 1


def pacific_now() -> datetime:
    """Return Pacific time even on Windows Python installs without tzdata."""
    try:
        return datetime.now(ZoneInfo("America/Los_Angeles"))
    except ZoneInfoNotFoundError:
        now = datetime.now(timezone.utc)
        march_eighth = date(now.year, 3, 8)
        dst_start_day = march_eighth + timedelta(days=(6 - march_eighth.weekday()) % 7)
        november_first = date(now.year, 11, 1)
        dst_end_day = november_first + timedelta(days=(6 - november_first.weekday()) % 7)
        # US Pacific daylight saving starts at 10:00 UTC and ends at 09:00 UTC.
        dst_start = datetime.combine(dst_start_day, datetime.min.time(), timezone.utc) + timedelta(hours=10)
        dst_end = datetime.combine(dst_end_day, datetime.min.time(), timezone.utc) + timedelta(hours=9)
        return now + timedelta(hours=-7 if dst_start <= now < dst_end else -8)


def rows(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def merge(source: Path, destination: Path) -> int:
    existing = rows(destination) if destination.exists() else []
    incoming = rows(source)
    if not incoming:
        return len(existing)
    fields = list(incoming[0])
    if existing and list(existing[0]) != fields:
        raise ValueError("season and daily CSV headers do not match")
    known = {tuple(row[key] for key in IDENTITY) for row in existing}
    additions = [row for row in incoming if tuple(row[key] for key in IDENTITY) not in known]
    if not additions:
        return len(existing)
    fd, temporary = tempfile.mkstemp(dir=destination.parent, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=fields)
            writer.writeheader()
            writer.writerows(existing)
            writer.writerows(additions)
        os.replace(temporary, destination)
    except Exception:
        os.unlink(temporary)
        raise
    return len(existing) + len(additions)


def read_state() -> dict[str, int]:
    if not STATE.exists():
        return {}
    return json.loads(STATE.read_text(encoding="utf-8"))


def commit_graph(target: date) -> bool:
    """Commit and push only the generated graph when its content changed."""
    graph = "data/generated/graph.json"
    unchanged = subprocess.run(["git", "diff", "--quiet", "HEAD", "--", graph], cwd=ROOT).returncode == 0
    if unchanged:
        print("graph content unchanged; skipping Git commit and push")
        return False
    subprocess.run(["git", "add", "--", graph], cwd=ROOT, check=True)
    staged = subprocess.run(["git", "diff", "--cached", "--quiet", "--", graph], cwd=ROOT).returncode != 0
    if not staged:
        print("graph has no staged change; skipping Git commit and push")
        return False
    subprocess.run(["git", "commit", "--only", "-m", f"Update roster graph for {target.isoformat()}", "--", graph], cwd=ROOT, check=True)
    subprocess.run(["git", "push", "origin", "HEAD:main"], cwd=ROOT, check=True)
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--date", type=date.fromisoformat, help="game date to collect (YYYY-MM-DD); defaults to yesterday in Pacific time")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--no-git-push", action="store_true", help="rebuild locally without committing graph.json")
    args = parser.parse_args()
    target = args.date or (pacific_now().date() - timedelta(days=1))
    year = season_start(target)
    season_csv = RAW / f"nba-rosters-{year}-{year + 1}.csv"
    daily_csv = CACHE / f"nba-rosters-{target.isoformat()}.csv"
    historical_csv = RAW / "nba-rosters-1946-2025.csv"
    if not historical_csv.exists():
        raise FileNotFoundError(historical_csv)
    CACHE.mkdir(parents=True, exist_ok=True)
    if args.dry_run:
        print(f"would collect {target}, merge into {season_csv}, and rebuild if its row count grows")
        return
    subprocess.run([sys.executable, str(ROOT / "scripts" / "download_nba_rosters.py"), "--date", target.isoformat(), "--output", str(daily_csv), "--overwrite"], check=True)
    count = merge(daily_csv, season_csv)
    state = read_state()
    previous = state.get(season_csv.name, 0)
    if count <= previous:
        print(f"no new season rows ({count:,}); graph unchanged")
        return
    candidate = GENERATED / "graph.next.json"
    if candidate.exists():
        candidate.unlink()
    subprocess.run([sys.executable, str(ROOT / "scripts" / "build_roster_graph.py"), "--input", str(historical_csv), "--input", str(season_csv), "--output", str(candidate)], check=True)
    os.replace(candidate, GENERATED / "graph.json")
    if not args.no_git_push:
        commit_graph(target)
    STATE.write_text(json.dumps({**state, season_csv.name: count}, indent=2), encoding="utf-8")
    print(f"updated graph from {count:,} {year}-{year + 1} season rows")


if __name__ == "__main__":
    main()
