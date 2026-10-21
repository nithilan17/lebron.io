import { graph, edgeBetween } from "@/lib/graph";
import { puzzleFromId, START } from "@/lib/puzzle";
import { requestSchema } from "@/lib/schemas";
import { z } from "zod";
export async function POST(request: Request) { const body = requestSchema.extend({ playerId:z.string() }).safeParse(await request.json().catch(()=>null)); if (!body.success) return Response.json({error:"Invalid move."},{status:400}); const {chain,playerId,puzzleId,graphVersion}=body.data, p=puzzleFromId(puzzleId); if(!p||puzzleId!==p.id||graphVersion!==p.graphVersion||chain[0]!==START||new Set(chain).size!==chain.length||chain.includes(playerId)||!graph.players[playerId]||!edgeBetween(chain.at(-1)!,playerId)) return Response.json({error:"That connection is not valid."},{status:400}); const next=[...chain,playerId]; return Response.json({ chain:next, won:playerId===p.targetId }); }
