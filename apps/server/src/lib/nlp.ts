import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** Cheap LLM classifier with fallback to rules */
export async function classifyIntent(text: string): Promise<{type: string; amount?: number; email?: string}> {
  const t = (text || '').toLowerCase().trim();
  if (!process.env.OPENAI_API_KEY) {
    // Fallback rules
    if (/(book|reservation|appointment)/.test(t)) return { type: 'BOOKING_START' };
    if (/(price|cost|hours|location|menu|services|training)/.test(t)) return { type: 'FAQ' };
    if (/(pay|payment|deposit|checkout)/.test(t)) return { type: 'PAYMENT_REQUEST' };
    return { type: 'SMALLTALK' };
  }

  const sys = 'Classify the user\'s intent into one of: FAQ, BOOKING_START, PAYMENT_REQUEST, SMALLTALK. Return ONLY a JSON object with "type".';
  const user = `User message: """${text}"""`;

  try {
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      temperature: 0
    });
    const content = resp.choices?.[0]?.message?.content || "";
    const jsonStart = content.indexOf("{");
    const jsonEnd = content.lastIndexOf("}");
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      const parsed = JSON.parse(content.slice(jsonStart, jsonEnd + 1));
      if (parsed?.type) return parsed;
    }
  } catch (e) {
    // swallow and fallback
  }

  // Fallback
  if (/(book|reservation|appointment)/.test(t)) return { type: 'BOOKING_START' };
  if (/(price|cost|hours|location|menu|services|training)/.test(t)) return { type: 'FAQ' };
  if (/(pay|payment|deposit|checkout)/.test(t)) return { type: 'PAYMENT_REQUEST' };
  return { type: 'SMALLTALK' };
}
