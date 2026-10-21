import { z } from "zod";
export const chainSchema = z.array(z.string().min(1).max(120)).min(1).max(30);
export const requestSchema = z.object({ puzzleId: z.string().max(40), graphVersion: z.string().max(60), chain: chainSchema });
