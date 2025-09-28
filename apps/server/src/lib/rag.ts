import OpenAI from 'openai';
import { getPool } from './db.js';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embedText(text: string): Promise<number[]> {
  const resp = await client.embeddings.create({ model: 'text-embedding-3-small', input: text });
  return resp.data[0].embedding as unknown as number[];
}

/**
 * Embedding-backed FAQ search with fallback to LIKE.
 * NOTE: For production, enable pgvector and store embeddings.
 */
export async function searchFAQ(tenant_id: string, query: string): Promise<{answer: string; confidence: number} | null> {
  const pool = await getPool();
  if (process.env.OPENAI_API_KEY) {
    try {
      // Try vector ANN if embeddings exist
      const qEmb = await embedText(query);
      const res = await pool.query(
        "SELECT content, 1 - (embedding <=> $1::vector) AS score FROM faq_documents WHERE tenant_id=$2 AND embedding IS NOT NULL ORDER BY embedding <=> $1::vector ASC LIMIT 1",
        [JSON.parse(JSON.stringify(qEmb)), tenant_id]
      );
      if (res.rowCount) {
        const row = res.rows[0];
        if (row.score >= 0.6) return { answer: row.content, confidence: Math.min(0.95, Math.max(0.6, Number(row.score))) };
      }
    } catch {}
  }
  const pool = await getPool();

  if (!process.env.OPENAI_API_KEY) {
    // Fallback LIKE search
    const q = `%${query.toLowerCase().slice(0, 64)}%`;
    const res = await pool.query('SELECT content FROM faq_documents WHERE tenant_id=$1 AND lower(content) LIKE $2 LIMIT 1', [tenant_id, q]);
    if (!res.rowCount) return null;
    return { answer: res.rows[0].content, confidence: 0.6 };
  }

  // Pull top N docs (simplified). For real use, use pgvector ANN search.
  const rows = await pool.query('SELECT id, content FROM faq_documents WHERE tenant_id=$1 ORDER BY updated_at DESC LIMIT 50', [tenant_id]);
  const candidates = rows.rows as {id: string, content: string}[];
  if (!candidates.length) return null;

  // Embed query and do cosine similarity in JS (coarse, ok for small N)
  const qEmb = await embed(query);
  let best = { id: "", content: "", score: -1 };
  for (const c of candidates) {
    const cEmb = await embed(c.content.slice(0, 2000));
    const score = cosineSim(qEmb, cEmb);
    if (score > best.score) best = { id: c.id, content: c.content, score };
  }
  if (best.score < 0.6) return null;

  return { answer: best.content, confidence: Math.min(0.95, Math.max(0.6, best.score)) };
}

async function embed(text: string): Promise<number[]> {
  const resp = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text
  });
  return resp.data[0].embedding as unknown as number[];
}

function cosineSim(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i=0;i<n;i++){ dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return dot / (Math.sqrt(na)*Math.sqrt(nb) + 1e-9);
}
