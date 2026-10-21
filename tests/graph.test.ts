import { describe, expect, it } from "vitest";
import { edgeBetween, graph, normalize, shortestPath } from "@/lib/graph";
import { puzzleFor, START } from "@/lib/puzzle";
describe("teammate graph", () => {
  const idFor = (name:string) => Object.values(graph.players).find(player => player.name === name)!.id;
  const lebron = idFor("LeBron James"), rondo = idFor("Rajon Rondo");
  it("finds a deterministic shortest path", () => { const path=shortestPath(lebron, rondo)!; expect(path[0]).toBe(lebron); expect(path.at(-1)).toBe(rondo); expect(shortestPath(lebron, rondo)).toEqual(path); });
  it("records evidence only on real edges", () => { const path=shortestPath(lebron, rondo)!; const evidence=edgeBetween(path[0],path[1])?.evidence[0]; expect(evidence?.team).toBeTruthy(); expect(evidence?.gameId).toBeTruthy(); expect(edgeBetween(lebron,"not-a-player")).toBeUndefined(); });
  it("uses NBA player IDs for the active graph's puzzle", () => { const puzzle=puzzleFor("2026-10-20"); expect(START).toBe(lebron); expect(puzzle.optimal[0]).toBe(lebron); expect(puzzle.target).toBeTruthy(); });
  it("normalizes accents for search", () => expect(normalize("Giánnis")).toBe("giannis"));
  it("honors no-repeat blocking", () => expect(shortestPath(lebron,rondo,new Set([rondo]))).toBeNull());
});
