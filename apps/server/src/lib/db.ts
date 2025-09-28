import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function findTenantByRecipient(recipient: string) {
  // Map WhatsApp phone number to tenant
  const res = await pool.query('SELECT * FROM tenants WHERE whatsapp_number = $1 LIMIT 1', [recipient]);
  return res.rows[0] || null;
}

export async function logMessage(tenant_id: string, user_phone: string, direction: 'in'|'out', body: string, intent: string|null, confidence: number|null, tool_called: string|null) {
  await pool.query(
    'INSERT INTO messages_audit (tenant_id, user_phone, direction, body, intent, confidence, tool_called) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [tenant_id, user_phone, direction, body, intent, confidence, tool_called]
  );
}

export async function upsertFAQ(tenant_id: string, title: string, content: string, embedding?: number[]) {
  await pool.query(
    'INSERT INTO faq_documents (tenant_id, title, content, embedding) VALUES ($1,$2,$3,$4)',
    [tenant_id, title, content, embedding ? JSON.parse(JSON.stringify(embedding)) : null]
  );
}

export async function createTenant(name: string, whatsapp_number: string, locale = 'en_GH', time_zone = 'Africa/Accra') {
  const res = await pool.query(
    'INSERT INTO tenants (name, whatsapp_number, locale, time_zone) VALUES ($1,$2,$3,$4) RETURNING *',
    [name, whatsapp_number, locale, time_zone]
  );
  return res.rows[0];
}

export async function listFAQs(tenant_id: string) {
  const res = await pool.query('SELECT id, title, content, updated_at FROM faq_documents WHERE tenant_id = $1 ORDER BY updated_at DESC', [tenant_id]);
  return res.rows;
}

export async function getPool() { return pool; }
