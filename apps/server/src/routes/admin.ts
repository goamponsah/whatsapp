import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createTenant, upsertFAQ, listFAQs } from '../lib/db.js';

export async function adminRoutes(app: FastifyInstance) {
  // Simple JWT-like shared-token check
  app.addHook('preHandler', async (req, reply) => {
    const openPaths = ['/admin/tenants']; // keep tenant create open if desired; else remove
    const path = (req as any).raw?.url || '';
    if (!path.startsWith('/admin')) return;
    const token = (req.headers['authorization'] || '').replace('Bearer ', '');
    const expected = process.env.SERVER_ADMIN_JWT || '';
    if (!expected) return; // disabled if not set
    if (!token || token !== expected) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });
  app.post('/tenants', async (req, reply) => {
    const schema = z.object({ name: z.string(), whatsapp_number: z.string() });
    const body = schema.parse(req.body);
    const t = await createTenant(body.name, body.whatsapp_number);
    reply.send(t);
  });

  app.post('/faqs/upload', async (req, reply) => {
    // Accept simple JSON: { tenant_id, title, content }
    const schema = z.object({
      tenant_id: z.string().uuid(),
      title: z.string().default('FAQ'),
      content: z.string().min(1)
    });
    const body = schema.parse(req.body);
    const { upsertFAQ } = await import('../lib/db.js');
    const { embedText } = await import('../lib/rag.js');
    let emb: number[] | null = null;
    try { emb = await embedText(body.content); } catch {}
    await upsertFAQ(body.tenant_id, body.title, body.content, emb || undefined);
    reply.send({ ok: true });
  });

  app.get('/faqs', async (req, reply) => {
    const tenant_id = (req.query as any).tenant_id;
    if (!tenant_id) return reply.code(400).send({ error: 'tenant_id required' });
    const rows = await listFAQs(tenant_id);
    reply.send(rows);
  });

  app.get('/logs', async (req, reply) => {
    const tenant_id = (req.query as any).tenant_id;
    const limit = Number((req.query as any).limit || 100);
    if (!tenant_id) return reply.code(400).send({ error: 'tenant_id required' });
    const { getPool } = await import('../lib/db.js');
    const pool = await getPool();
    const res = await pool.query(
      'SELECT created_at, user_phone, direction, intent, confidence, body FROM messages_audit WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT $2',
      [tenant_id, limit]
    );
    reply.send(res.rows);
  });

  app.post('/payments/initiate', async (req, reply) => {
    const body = req.body as any;
    const email = body?.email;
    const amount = Number(body?.amount);
    const metadata = body?.metadata || {};
    if (!email || !amount) return reply.code(400).send({ error: 'email and amount required' });
    const { createPaystackLink } = await import('../lib/pay.js');
    try {
      const { url, reference } = await createPaystackLink(email, amount, metadata);
      reply.send({ url, reference });
    } catch (e: any) {
      reply.code(500).send({ error: e?.message || 'payment init failed' });
    }
  });

  app.get('/bookings', async (req, reply) => {
    const tenant_id = (req.query as any).tenant_id;
    const limit = Number((req.query as any).limit || 100);
    if (!tenant_id) return reply.code(400).send({ error: 'tenant_id required' });
    const { getPool } = await import('../lib/db.js');
    const pool = await getPool();
    const res = await pool.query(
      'SELECT id, user_phone, user_name, start_time, end_time, status, payment_status, paystack_ref, created_at FROM bookings WHERE tenant_id=$1 ORDER BY start_time DESC NULLS LAST, created_at DESC LIMIT $2',
      [tenant_id, limit]
    );
    reply.send(res.rows);
  });

  app.post('/bookings', async (req, reply) => {
    const body = req.body as any;
    const required = ['tenant_id', 'user_phone', 'start_time', 'end_time'];
    for (const k of required) if (!body?.[k]) return reply.code(400).send({ error: `${k} required` });
    const { getPool } = await import('../lib/db.js');
    const pool = await getPool();
    const res = await pool.query(
      'INSERT INTO bookings (tenant_id, user_phone, user_name, start_time, end_time, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [body.tenant_id, body.user_phone, body.user_name || null, body.start_time, body.end_time, body.status || 'pending']
    );
    reply.send(res.rows[0]);
  });

  app.post('/bookings/attach_ref', async (req, reply) => {
    const body = req.body as any;
    const required = ['booking_id', 'paystack_ref'];
    for (const k of required) if (!body?.[k]) return reply.code(400).send({ error: `${k} required` });
    const { getPool } = await import('../lib/db.js');
    const pool = await getPool();
    await pool.query('UPDATE bookings SET paystack_ref=$1 WHERE id=$2', [body.paystack_ref, body.booking_id]);
    reply.send({ ok: true });
  });

  // Availability rules
  app.get('/availability/rules', async (req, reply) => {
    const tenant_id = (req.query as any).tenant_id;
    if (!tenant_id) return reply.code(400).send({ error: 'tenant_id required' });
    const { getPool } = await import('../lib/db.js');
    const pool = await getPool();
    const res = await pool.query('SELECT weekday, open_time, close_time, slot_minutes FROM availability_rules WHERE tenant_id=$1 ORDER BY weekday', [tenant_id]);
    reply.send(res.rows);
  });

  app.post('/availability/rules', async (req, reply) => {
    const body = req.body as any;
    const { tenant_id, rules } = body || {};
    if (!tenant_id || !Array.isArray(rules)) return reply.code(400).send({ error: 'tenant_id and rules[] required' });
    const { getPool } = await import('../lib/db.js');
    const pool = await getPool();
    await pool.query('BEGIN');
    try {
      for (const r of rules) {
        await pool.query(
          `INSERT INTO availability_rules (tenant_id, weekday, open_time, close_time, slot_minutes)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (tenant_id, weekday) DO UPDATE SET open_time=EXCLUDED.open_time, close_time=EXCLUDED.close_time, slot_minutes=EXCLUDED.slot_minutes`,
          [tenant_id, r.weekday, r.open_time, r.close_time, r.slot_minutes || 60]
        );
      }
      await pool.query('COMMIT');
      reply.send({ ok: true });
    } catch (e) {
      await pool.query('ROLLBACK');
      reply.code(500).send({ error: 'failed to upsert rules' });
    }
  });

  app.post('/availability/closed', async (req, reply) => {
    const body = req.body as any;
    const { tenant_id, date, reason } = body || {};
    if (!tenant_id || !date) return reply.code(400).send({ error: 'tenant_id and date required' });
    const { getPool } = await import('../lib/db.js');
    const pool = await getPool();
    await pool.query(
      'INSERT INTO unavailable_dates (tenant_id, date, reason) VALUES ($1,$2,$3) ON CONFLICT (tenant_id, date) DO NOTHING',
      [tenant_id, date, reason || null]
    );
    reply.send({ ok: true });
  });

  app.delete('/availability/closed', async (req, reply) => {
    const tenant_id = (req.query as any).tenant_id;
    const date = (req.query as any).date;
    if (!tenant_id || !date) return reply.code(400).send({ error: 'tenant_id and date required' });
    const { getPool } = await import('../lib/db.js');
    const pool = await getPool();
    await pool.query('DELETE FROM unavailable_dates WHERE tenant_id=$1 AND date=$2', [tenant_id, date]);
    reply.send({ ok: true });
  });

  // Generate slots for a given date. tz optional (defaults to Africa/Accra)
  app.get('/availability/slots', async (req, reply) => {
    const tenant_id = (req.query as any).tenant_id;
    const date = (req.query as any).date; // YYYY-MM-DD
    const tz = (req.query as any).tz || 'Africa/Accra';
    if (!tenant_id || !date) return reply.code(400).send({ error: 'tenant_id and date required' });
    const { getPool } = await import('../lib/db.js');
    const pool = await getPool();

    const weekday = new Date(date + 'T00:00:00').getDay();
    const rr = await pool.query('SELECT open_time, close_time, slot_minutes FROM availability_rules WHERE tenant_id=$1 AND weekday=$2 LIMIT 1', [tenant_id, weekday]);
    if (!rr.rowCount) return reply.send([]);

    const closed = await pool.query('SELECT 1 FROM unavailable_dates WHERE tenant_id=$1 AND date=$2', [tenant_id, date]);
    if (closed.rowCount) return reply.send([]);

    const r = rr.rows[0];
    const open = r.open_time;   // "HH:MM:SS"
    const close = r.close_time; // "HH:MM:SS"
    const slot = Number(r.slot_minutes || 60);

    // Build slots
    const [oh, om] = open.split(':').map(Number);
    const [ch, cm] = close.split(':').map(Number);
    const start = new Date(date + 'T00:00:00');
    start.setHours(oh, om, 0, 0);
    const end = new Date(date + 'T00:00:00');
    end.setHours(ch, cm, 0, 0);

    let slots: any[] = [];
    for (let t = new Date(start); t < end; t = new Date(t.getTime() + slot*60000)) {
      const sStart = new Date(t);
      const sEnd = new Date(t.getTime() + slot*60000);
      if (sEnd > end) break;
      slots.push({ start: sStart.toISOString(), end: sEnd.toISOString() });
    }

    // Remove slots that overlap with existing bookings
    const bq = await pool.query(
      'SELECT start_time, end_time FROM bookings WHERE tenant_id=$1 AND DATE(start_time) = $2 AND status != $3',
      [tenant_id, date, 'cancelled']
    );
    const bookings = bq.rows;

    function overlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
      return aStart < bEnd && bStart < aEnd;
    }

    slots = slots.filter(s => {
      const sStart = new Date(s.start);
      const sEnd = new Date(s.end);
      for (const b of bookings) {
        const bStart = new Date(b.start_time);
        const bEnd = new Date(b.end_time);
        if (overlap(sStart, sEnd, bStart, bEnd)) return False;
      }
      return True;
    });

    reply.send(slots);
  });
}
