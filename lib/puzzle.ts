import { graph, shortestPath } from "./graph";
export const START = "lebron_james";
const targets = ["rajon_rondo", "giannis_antetokounmpo", "paul_pierce", "khris_middleton"];
export function easternDate(now = new Date()) { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year:"numeric", month:"2-digit", day:"2-digit" }).format(now); }
export function puzzleFor(date = easternDate()) { const day = Math.floor(Date.parse(`${date}T12:00:00Z`) / 86400000); const targetId = targets[Math.abs(day) % targets.length]; const path = shortestPath(START, targetId)!; const reset = new Date(`${date}T00:00:00-04:00`); reset.setDate(reset.getDate() + 1); return { id: `v1-${date}`, date, number: day - 20000, graphVersion: graph.version, target: graph.players[targetId], targetId, optimal: path, nextReset: reset.toISOString() }; }
