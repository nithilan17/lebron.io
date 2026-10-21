import { describe, expect, it } from "vitest";
import { edgeBetween, normalize, shortestPath } from "@/lib/graph";
describe("teammate graph", () => {
  it("finds a deterministic shortest path", () => expect(shortestPath("lebron_james", "rajon_rondo")).toEqual(["lebron_james","chris_bosh","ray_allen","kevin_garnett","paul_pierce","rajon_rondo"]));
  it("records evidence only on real edges", () => { expect(edgeBetween("lebron_james","dwyane_wade")?.evidence[0].team).toBe("Miami Heat"); expect(edgeBetween("lebron_james","kevin_garnett")).toBeUndefined(); });
  it("normalizes accents for search", () => expect(normalize("Giánnis")).toBe("giannis"));
  it("honors no-repeat blocking", () => expect(shortestPath("ray_allen","rajon_rondo",new Set(["kevin_garnett","paul_pierce"]))).toBeNull());
});
