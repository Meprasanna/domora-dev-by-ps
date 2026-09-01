import { invokeLLM } from "./_core/llm";

export type RoomComparison = { sourceRoom: string; candidateRoom: string; sourcePriceInr: number; candidatePriceInr: number };

export async function compareRooms(input: RoomComparison[]) {
  if (!input.length) return { matches: [], anomalies: [] };
  const response = await invokeLLM({
    model: "gpt-5-mini",
    messages: [
      { role: "system", content: "You compare normalized hotel room descriptions. Never calculate or authorize a booking. Return only the requested JSON." },
      { role: "user", content: `Compare these rooms against Domora's goal of finding comparable stays near 20% below market. Flag semantic mismatches and price anomalies, but do not invent missing facts.\n${JSON.stringify(input)}` },
    ],
    response_format: { type: "json_schema", json_schema: { name: "room_comparison", strict: true, schema: { type: "object", properties: { matches: { type: "array", items: { type: "object", properties: { sourceRoom: { type: "string" }, candidateRoom: { type: "string" }, confidence: { type: "number" }, rationale: { type: "string" } }, required: ["sourceRoom", "candidateRoom", "confidence", "rationale"], additionalProperties: false } }, anomalies: { type: "array", items: { type: "object", properties: { candidateRoom: { type: "string" }, reason: { type: "string" } }, required: ["candidateRoom", "reason"], additionalProperties: false } } }, required: ["matches", "anomalies"], additionalProperties: false } } },
  });
  const content = response.choices[0]?.message?.content;
  return typeof content === "string" ? JSON.parse(content) as { matches: unknown[]; anomalies: unknown[] } : { matches: [], anomalies: [] };
}
