import { describe, expect, it } from "vitest";
import { edgeBetween, graph, normalize, shortestPath } from "@/lib/graph";
import { puzzleFor, START } from "@/lib/puzzle";
import schedule from "@/data/generated/puzzle-schedule.json";
describe("teammate graph", () => {
  const idFor = (name:string) => Object.values(graph.players).find(player => player.name === name)!.id;
  const lebron = idFor("LeBron James"), rondo = idFor("Rajon Rondo");
  it("finds a deterministic shortest path", () => { const path=shortestPath(lebron, rondo)!; expect(path[0]).toBe(lebron); expect(path.at(-1)).toBe(rondo); expect(shortestPath(lebron, rondo)).toEqual(path); });
  it("records evidence only on real edges", () => { const path=shortestPath(lebron, rondo)!; const evidence=edgeBetween(path[0],path[1])?.evidence[0]; expect(evidence?.team).toBeTruthy(); expect(evidence?.gameId).toBeTruthy(); expect(edgeBetween(lebron,"not-a-player")).toBeUndefined(); });
  it("keeps separate teammate stints when a player returns after a gap", () => {
    const varejao = idFor("Anderson Varejao");
    const cavsStints = edgeBetween(lebron, varejao)?.evidence.filter(e => e.team === "Cleveland Cavaliers");
    expect(cavsStints?.map(e => e.season)).toEqual(["2004-05–2009-10", "2014-15–2015-16"]);
  });
  it("uses NBA player IDs for the active graph's puzzle", () => { const puzzle=puzzleFor("2026-10-20"); expect(START).toBe(lebron); expect(puzzle.optimal[0]).toBe(lebron); expect(puzzle.target).toBeTruthy(); });
  it("creates an independent hard-mode puzzle", () => { const puzzle=puzzleFor("2026-10-20", "hard"); expect(puzzle.id).toBe("v3-hard-2026-10-20"); expect(puzzle.mode).toBe("hard"); expect(puzzle.optimal[0]).toBe(lebron); expect(puzzle.target).toBeTruthy(); });
  it("preloads distinct targets for every mode over the next 365 days", () => {
    const start = Date.parse("2026-10-25T12:00:00Z");
    const dates = Array.from({length:365}, (_, offset) => new Date(start + offset * 86_400_000).toISOString().slice(0,10));
    for (const mode of ["easy", "hard"] as const) {
      const targets = dates.map(date => schedule.puzzles[date as keyof typeof schedule.puzzles][mode]);
      expect(new Set(targets)).toHaveLength(365);
    }
    for (const target of dates.map(date => schedule.puzzles[date as keyof typeof schedule.puzzles].easy)) {
      expect(target).not.toBe(START);
      expect(edgeBetween(START, target)).toBeUndefined();
    }
    expect(puzzleFor("2026-10-25", "easy").targetId).toBe(schedule.puzzles["2026-10-25"].easy);
    expect(puzzleFor("2027-10-24", "hard").targetId).toBe(schedule.puzzles["2027-10-24"].hard);
  });
  it("normalizes accents for search", () => expect(normalize("Giánnis")).toBe("giannis"));
  it("honors no-repeat blocking", () => expect(shortestPath(lebron,rondo,new Set([rondo]))).toBeNull());
});
