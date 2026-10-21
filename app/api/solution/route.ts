import { edgeBetween, graph } from "@/lib/graph";
import { puzzleFor, START } from "@/lib/puzzle";
import { requestSchema } from "@/lib/schemas";
import { z } from "zod";
export async function POST(request: Request) { const body=requestSchema.extend({intent:z.enum(["won","given_up"])}).safeParse(await request.json().catch(()=>null)); if(!body.success)return Response.json({error:"Invalid request."},{status:400}); const p=puzzleFor(), d=body.data; const validChain=d.chain[0]===START&&new Set(d.chain).size===d.chain.length&&d.chain.every((id,i)=>!!graph.players[id]&&(i===0||!!edgeBetween(d.chain[i-1],id))); const won=validChain&&d.chain.at(-1)===p.targetId; if(d.puzzleId!==p.id||d.graphVersion!==p.graphVersion||!validChain||(d.intent==="won"&&!won))return Response.json({error:"Not eligible for solution."},{status:400}); return Response.json({ optimal:p.optimal.map(id=>graph.players[id]), edges:p.optimal.slice(1).map((id,i)=>edgeBetween(p.optimal[i],id)!.evidence) }); }
