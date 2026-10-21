import fs from "node:fs";
import path from "node:path";

export type Evidence = { team: string; season: string; gameId: string; gameDate: string };
export type Player = { id: string; name: string };
export type Edge = { a: string; b: string; evidence: Evidence[] };
export type Graph = { version: string; players: Record<string, Player>; edges: Edge[] };

type CompactStint = [string, string, string, string, string];
type CompactArtifact = { version: string; players: Record<string, string>; edges: [string, string, string, string, string, string, CompactStint?][] };

// Deliberately small verified-development fixture. Production history is generated offline by scripts/import_nba.py.
const fixture: Graph = {
  version: "fixture-2026.1",
  players: {
    lebron_james: { id: "lebron_james", name: "LeBron James" },
    dwyane_wade: { id: "dwyane_wade", name: "Dwyane Wade" },
    chris_bosh: { id: "chris_bosh", name: "Chris Bosh" },
    ray_allen: { id: "ray_allen", name: "Ray Allen" },
    kevin_garnett: { id: "kevin_garnett", name: "Kevin Garnett" },
    paul_pierce: { id: "paul_pierce", name: "Paul Pierce" },
    rajon_rondo: { id: "rajon_rondo", name: "Rajon Rondo" },
    anthony_davis: { id: "anthony_davis", name: "Anthony Davis" },
    jrue_holiday: { id: "jrue_holiday", name: "Jrue Holiday" },
    giannis_antetokounmpo: { id: "giannis_antetokounmpo", name: "Giannis Antetokounmpo" },
    khris_middleton: { id: "khris_middleton", name: "Khris Middleton" }
  },
  edges: [
    ["lebron_james","dwyane_wade","Miami Heat","2010–11","2010-10-26"], ["lebron_james","chris_bosh","Miami Heat","2011–12","2011-12-25"],
    ["dwyane_wade","ray_allen","Miami Heat","2012–13","2012-10-30"], ["chris_bosh","ray_allen","Miami Heat","2012–13","2012-10-30"],
    ["ray_allen","kevin_garnett","Boston Celtics","2007–08","2007-11-02"], ["kevin_garnett","paul_pierce","Boston Celtics","2007–08","2007-11-02"],
    ["paul_pierce","rajon_rondo","Boston Celtics","2007–08","2007-11-02"], ["lebron_james","anthony_davis","Los Angeles Lakers","2019–20","2019-10-22"],
    ["anthony_davis","jrue_holiday","New Orleans Pelicans","2017–18","2017-10-18"], ["jrue_holiday","giannis_antetokounmpo","Milwaukee Bucks","2023–24","2023-10-26"],
    ["giannis_antetokounmpo","khris_middleton","Milwaukee Bucks","2013–14","2013-10-30"]
  ].map(([a,b,team,season,date], index) => ({ a, b, evidence: [{ team, season, gameId: `fixture-${index + 1}`, gameDate: date }] })) as Edge[]
};

function loadArtifact(): Graph | null {
  const artifact = process.env.GRAPH_ARTIFACT || path.join(process.cwd(), "data", "generated", "graph.json");
  if (!fs.existsSync(artifact)) return null;
  const data = JSON.parse(fs.readFileSync(artifact, "utf8")) as CompactArtifact;
  if (!data.version || !data.players || !Array.isArray(data.edges)) throw new Error("Invalid roster graph artifact.");
  const players = Object.fromEntries(Object.entries(data.players).map(([id, name]) => [id, { id, name }]));
  const edges = data.edges.map(([a, b, team, season, gameId, gameDate, stints]) => {
    if (!players[a] || !players[b] || !team || !season || !gameId || !gameDate) throw new Error("Invalid roster graph edge.");
    const evidence = stints?.map(([stintTeam, firstSeason, lastSeason, stintGameId, stintGameDate]) => ({ team: stintTeam, season: firstSeason === lastSeason ? firstSeason : `${firstSeason}–${lastSeason}`, gameId: stintGameId, gameDate: stintGameDate })) ?? [{ team, season, gameId, gameDate }];
    return { a, b, evidence };
  });
  return { version: data.version, players, edges };
}

export const graph = loadArtifact() ?? fixture;

type Index = { neighbors: Map<string, { id: string; evidence: Evidence[] }[]>; edges: Map<string, Edge> };
const indexes = new WeakMap<Graph, Index>();
function edgeKey(a: string, b: string) { return a < b ? `${a}\0${b}` : `${b}\0${a}`; }
function indexFor(g: Graph): Index {
  const previous = indexes.get(g);
  if (previous) return previous;
  const neighbors = new Map<string, { id: string; evidence: Evidence[] }[]>();
  const edges = new Map<string, Edge>();
  for (const edge of g.edges) {
    edges.set(edgeKey(edge.a, edge.b), edge);
    (neighbors.get(edge.a) ?? neighbors.set(edge.a, []).get(edge.a)!).push({ id: edge.b, evidence: edge.evidence });
    (neighbors.get(edge.b) ?? neighbors.set(edge.b, []).get(edge.b)!).push({ id: edge.a, evidence: edge.evidence });
  }
  const index = { neighbors, edges };
  indexes.set(g, index);
  return index;
}
export function neighbors(id: string, g = graph) { return indexFor(g).neighbors.get(id) ?? []; }
export function edgeBetween(a: string, b: string, g = graph) { return indexFor(g).edges.get(edgeKey(a, b)); }
export function shortestPath(start: string, target: string, blocked = new Set<string>(), g = graph): string[] | null {
  const queue: string[][] = [[start]]; const seen = new Set([start, ...blocked]);
  while (queue.length) { const path = queue.shift()!; const here = path.at(-1)!; if (here === target) return path;
    for (const next of neighbors(here, g).map(x => x.id).sort()) if (!seen.has(next)) { seen.add(next); queue.push([...path, next]); }
  } return null;
}
export function normalize(value: string) { return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim(); }
