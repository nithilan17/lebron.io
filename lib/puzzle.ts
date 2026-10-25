import { graph, neighbors, shortestPath } from "./graph";
import schedule from "@/data/generated/puzzle-schedule.json";
function playerId(name: string, fallback: string) { return Object.values(graph.players).find(player => player.name === name)?.id ?? fallback; }
export const START = playerId("LeBron James", "lebron_james");
export const MODES = ["easy", "hard"] as const;
export type PuzzleMode = typeof MODES[number];
const PUZZLE_EPOCH = Math.floor(Date.parse("2026-10-20T12:00:00Z") / 86400000);
export function easternDate(now = new Date()) { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year:"numeric", month:"2-digit", day:"2-digit" }).format(now); }
function distancesFromStart() { const distances = new Map<string, number>([[START, 0]]); const queue = [START]; for (let index = 0; index < queue.length; index++) for (const neighbor of neighbors(queue[index])) if (!distances.has(neighbor.id)) { distances.set(neighbor.id, distances.get(queue[index])! + 1); queue.push(neighbor.id); } return distances; }
const fallbackTargets = (() => {
  const distances = distancesFromStart();
  const easy = Object.keys(graph.players).filter(id => { const distance = distances.get(id), teammateCount = neighbors(id).length; return id !== START && distance !== undefined && distance >= 3 && distance <= 4 && teammateCount >= 60; }).sort();
  const hard = Object.keys(graph.players).filter(id => { const distance = distances.get(id), teammateCount = neighbors(id).length; return id !== START && distance !== undefined && distance >= 3 && distance <= 5 && teammateCount >= 5 && teammateCount <= 20; }).sort();
  return { easy: easy.length ? easy : hard, hard: hard.length ? hard : easy };
})();
type PreloadedSchedule = { puzzles: Record<string, Record<PuzzleMode, string>> };
const preloadedSchedule = schedule as PreloadedSchedule;
function targetFor(date: string, mode: PuzzleMode, day: number) {
  const scheduled = preloadedSchedule.puzzles[date]?.[mode];
  if (scheduled && graph.players[scheduled]) return scheduled;
  const targets = fallbackTargets[mode];
  if (!targets.length) throw new Error("No eligible puzzle targets are available.");
  return targets[Math.abs(day) % targets.length];
}
export function puzzleFor(date = easternDate(), mode: PuzzleMode = "easy") { const day = Math.floor(Date.parse(`${date}T12:00:00Z`) / 86400000); const targetId = targetFor(date, mode, day); const path = shortestPath(START, targetId)!; const reset = new Date(`${date}T00:00:00-04:00`); reset.setDate(reset.getDate() + 1); return { id: `v3-${mode}-${date}`, mode, date, number: Math.max(1, day - PUZZLE_EPOCH + 1), graphVersion: graph.version, target: graph.players[targetId], targetId, optimal: path, nextReset: reset.toISOString() }; }
export function puzzleFromId(id: string) { const match = /^v3-(easy|hard)-(\d{4}-\d{2}-\d{2})$/.exec(id); return match ? puzzleFor(match[2], match[1] as PuzzleMode) : null; }
