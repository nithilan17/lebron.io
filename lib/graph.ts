export type Evidence = { team: string; season: string; gameId: string; gameDate: string };
export type Player = { id: string; name: string };
export type Edge = { a: string; b: string; evidence: Evidence[] };
export type Graph = { version: string; players: Record<string, Player>; edges: Edge[] };

// Deliberately small verified-development fixture. Production history is generated offline by scripts/import_nba.py.
export const graph: Graph = {
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

export function neighbors(id: string, g = graph) { return g.edges.flatMap(e => e.a === id ? [{ id: e.b, evidence: e.evidence }] : e.b === id ? [{ id: e.a, evidence: e.evidence }] : []); }
export function edgeBetween(a: string, b: string, g = graph) { return g.edges.find(e => (e.a === a && e.b === b) || (e.a === b && e.b === a)); }
export function shortestPath(start: string, target: string, blocked = new Set<string>(), g = graph): string[] | null {
  const queue: string[][] = [[start]]; const seen = new Set([start, ...blocked]);
  while (queue.length) { const path = queue.shift()!; const here = path.at(-1)!; if (here === target) return path;
    for (const next of neighbors(here, g).map(x => x.id).sort()) if (!seen.has(next)) { seen.add(next); queue.push([...path, next]); }
  } return null;
}
export function normalize(value: string) { return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim(); }
