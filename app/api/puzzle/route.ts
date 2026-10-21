import { puzzleFor } from "@/lib/puzzle";
export const dynamic = "force-dynamic";
export async function GET() { const p = puzzleFor(); return Response.json({ id:p.id, date:p.date, number:p.number, graphVersion:p.graphVersion, target:p.target, nextReset:p.nextReset }); }
