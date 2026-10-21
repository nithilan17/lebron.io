import { graph } from "@/lib/graph";
import { puzzleFor, START } from "@/lib/puzzle";
import { z } from "zod";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().safeParse(new URL(request.url).searchParams.get("date") ?? undefined); if(!date.success) return Response.json({error:"Invalid puzzle date."},{status:400}); const p = puzzleFor(date.data); return Response.json({ id:p.id, date:p.date, number:p.number, graphVersion:p.graphVersion, start:graph.players[START], target:p.target, nextReset:p.nextReset }); }
