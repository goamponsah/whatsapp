// apps/server/src/lib/rag.ts
import OpenAI from 'openai';
import { getPool } from './db.js';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Get an embedding vector for the given text.
 * Uses text-embedding-3-small (1536 dims). Returns [] if no API key.
 */
export async function embedText(text: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) return [];
  const resp = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return (resp.data[0].embedding as unknown as number[]) || [];
}

/**
 * Search FAQs for the best answer.
 * Prefers pgvector ANN (embedding <=> $1::vector); falls back to LIKE if vectors/API key are unavailable.
 */
export async function searchFAQ(
  tenant_id: string,
  query: string
): Promise<{ answer: string; confidence: number } | null> {
  const pool = await getPool();

  // Try vector search if we have an API key (so embeddings are possible)
  if (process.env.OPENAI_API_KEY) {
    try {
      const qEmb = await embedText(query);
      if (qEmb.length > 0) {
        // Pass a plain JSON array so pg can cast to vector
        const vectorParam = JSON.parse(JSON.stringify(qEmb));
        const res = await pool.query(
          `
          SELECT content,
                 1 - (embedding <=> $1::vector) AS score
            FROM faq_documents
           WHERE tenant_id = $2
             AND embedding IS NOT NULL
           ORDER BY embedding <=> $1::vector ASC
           LIMIT 1
          `,
          [vectorParam, tenant_id]
        );

        if (res.rowCount) {
          const row: any = res.rows[0];
          const score = Number(row.score) || 0;
          if (score >= 0.6) {
            return {
              answer: row.content as string,
              confidence: Math.min(0.95, Math.max(0.6, score)),
            };
          }
        }
      }
    } catch {
      // swallow and fall through to LIKE
    }
  }

  // Fallback: simple LIKE search over content
  const q = `%${(query || '').toLowerCase().slice(0, 256)}%`;
  const res2 = await pool.query(
    `
    SELECT content
      FROM faq_documents
     WHERE tenant_id = $1
       AND lower(content) LIKE $2
     ORDER BY updated_at DESC
     LIMIT 1
    `,
    [tenant_id, q]
  );

  if (!res2.rowCount) return null;
  return {
    answer: res2.rows[0].content as string,
    confidence: 0.6,
  };
}
