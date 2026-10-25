"""Generate a finite, pinned daily puzzle schedule from the runtime graph.

The schedule is intentionally checked in.  Regenerate it whenever the graph is
released so every published date has a fixed target in both difficulty modes.
"""

from __future__ import annotations

import argparse
import json
import random
import unicodedata
from collections import defaultdict, deque
from datetime import date, timedelta
from pathlib import Path

from easy_target_names import EASY_TARGET_NAMES


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_GRAPH = ROOT / "data" / "generated" / "graph.json"
DEFAULT_OUTPUT = ROOT / "data" / "generated" / "puzzle-schedule.json"


def distances_and_degrees(graph: dict) -> tuple[dict[str, int], dict[str, int], str]:
    adjacent: dict[str, list[str]] = defaultdict(list)
    for edge in graph["edges"]:
        adjacent[edge[0]].append(edge[1])
        adjacent[edge[1]].append(edge[0])
    start = next(player_id for player_id, name in graph["players"].items() if name == "LeBron James")
    distances = {start: 0}
    queue = deque([start])
    while queue:
        player_id = queue.popleft()
        for teammate_id in adjacent[player_id]:
            if teammate_id not in distances:
                distances[teammate_id] = distances[player_id] + 1
                queue.append(teammate_id)
    return distances, {player_id: len(teammates) for player_id, teammates in adjacent.items()}, start


def choose(candidates: list[str], count: int, seed: str) -> list[str]:
    if len(candidates) < count:
        raise ValueError(f"Need {count} eligible targets, found only {len(candidates)}.")
    shuffled = sorted(candidates)
    random.Random(seed).shuffle(shuffled)
    return shuffled[:count]


def normalized_name(name: str) -> str:
    decomposed = unicodedata.normalize("NFKD", name)
    return "".join(character for character in decomposed.lower() if character.isalnum())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--graph", type=Path, default=DEFAULT_GRAPH)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--start-date", type=date.fromisoformat, required=True)
    parser.add_argument("--days", type=int, default=365)
    args = parser.parse_args()
    if args.days < 1:
        raise ValueError("--days must be positive")

    graph = json.loads(args.graph.read_text(encoding="utf-8"))
    distances, degrees, start = distances_and_degrees(graph)
    names_by_key = {normalized_name(name): player_id for player_id, name in graph["players"].items()}
    approved_easy_ids = {names_by_key[name] for raw_name in EASY_TARGET_NAMES if (name := normalized_name(raw_name)) in names_by_key}
    # Easy targets are editorially curated recognizable names. They must not be
    # direct LeBron teammates, and remain short enough to be approachable.
    easy = [
        player_id for player_id in approved_easy_ids
        if 2 <= distances.get(player_id, 0) <= 4
    ]
    hard = [
        player_id for player_id, distance in distances.items()
        if player_id != start and 3 <= distance <= 5 and 5 <= degrees[player_id] <= 20
    ]
    easy_targets = choose(easy, args.days, f"{graph['version']}:easy:{args.start_date}")
    hard_targets = choose(hard, args.days, f"{graph['version']}:hard:{args.start_date}")
    puzzles = {
        (args.start_date + timedelta(days=offset)).isoformat(): {
            "easy": easy_targets[offset],
            "hard": hard_targets[offset],
        }
        for offset in range(args.days)
    }
    payload = {
        "version": "puzzle-schedule-v1",
        "graphVersion": graph["version"],
        "startsOn": args.start_date.isoformat(),
        "endsOn": (args.start_date + timedelta(days=args.days - 1)).isoformat(),
        "puzzles": puzzles,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
