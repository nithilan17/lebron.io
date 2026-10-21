import { graph } from "@/lib/graph";
import { MODES, puzzleFor, START } from "@/lib/puzzle";
import { z } from "zod";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { const params=new URL(request.url).searchParams; const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().safeParse(params.get("date") ?? undefined); const mode=z.enum(MODES).optional().safeParse(params.get("mode") ?? undefined); if(!date.success||!mode.success) return Response.json({error:"Invalid puzzle request."},{status:400}); const p = puzzleFor(date.data, mode.data); return Response.json({ id:p.id, mode:p.mode, date:p.date, number:p.number, graphVersion:p.graphVersion, start:graph.players[START], target:p.target, nextReset:p.nextReset }); }
