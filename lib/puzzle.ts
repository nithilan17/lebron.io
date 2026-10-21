import { graph, shortestPath } from "./graph";
function playerId(name: string, fallback: string) { return Object.values(graph.players).find(player => player.name === name)?.id ?? fallback; }
export const START = playerId("LeBron James", "lebron_james");
const targets = ["Rajon Rondo", "Giannis Antetokounmpo", "Paul Pierce", "Khris Middleton"].map((name, index) => playerId(name, ["rajon_rondo", "giannis_antetokounmpo", "paul_pierce", "khris_middleton"][index]));
const PUZZLE_EPOCH = Math.floor(Date.parse("2026-10-20T12:00:00Z") / 86400000);
export function easternDate(now = new Date()) { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year:"numeric", month:"2-digit", day:"2-digit" }).format(now); }
export function puzzleFor(date = easternDate()) { const day = Math.floor(Date.parse(`${date}T12:00:00Z`) / 86400000); const targetId = targets[Math.abs(day) % targets.length]; const path = shortestPath(START, targetId)!; const reset = new Date(`${date}T00:00:00-04:00`); reset.setDate(reset.getDate() + 1); return { id: `v2-${date}`, date, number: Math.max(1, day - PUZZLE_EPOCH + 1), graphVersion: graph.version, target: graph.players[targetId], targetId, optimal: path, nextReset: reset.toISOString() }; }
export function puzzleFromId(id: string) { const match = /^v2-(\d{4}-\d{2}-\d{2})$/.exec(id); return match ? puzzleFor(match[1]) : null; }
