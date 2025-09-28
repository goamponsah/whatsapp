import Fastify from 'fastify';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import { config } from 'dotenv';
import { verifyMetaSignature } from './lib/verify.js';
import { handleMessage } from './orchestrator.js';
import { adminRoutes } from './routes/admin.js';

config();

const app = Fastify({ logger: true });
app.register(formbody);
app.register(cors, { origin: true, credentials: true });
// Capture rawBody for webhook signature verification
app.addHook('onRequest', async (req: any, _reply: any) => {
  // Only buffer JSON bodies under ~1MB
  if (req.method === 'POST' && (req.headers['content-type']||'').includes('application/json')) {
    let data = '';
    await new Promise<void>((resolve) => {
      req.raw.on('data', (chunk: any) => (data += chunk));
      req.raw.on('end', () => resolve());
    });
    req.rawBody = data;
    try { req.body = data ? JSON.parse(data) : {}; } catch { req.body = {}; }
  }
});


const PORT = Number(process.env.PORT || 8080);

// Health
app.get('/health', async () => ({ ok: true }));

// WhatsApp webhook verification
app.get('/webhooks/whatsapp', async (req: any, reply: any) => {
  const mode = (req.query as any)['hub.mode'];
  const token = (req.query as any)['hub.verify_token'];
  const challenge = (req.query as any)['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return reply.code(200).send(challenge);
  }
  return reply.code(403).send('Forbidden');
});

// WhatsApp inbound
app.post('/webhooks/whatsapp', async (req: any, reply: any) => {
  const ok = verifyMetaSignature(req);
  if (!ok) return reply.code(401).send('Invalid signature');
  const payload = req.body as any;
  const entries = payload?.entry ?? [];
  for (const e of entries) {
    for (const change of (e.changes ?? [])) {
      const messages = change?.value?.messages;
      if (!messages || !messages[0]) continue;
      await handleMessage(messages[0], change?.value);
    }
  }
  return reply.code(200).send('OK');
});

// Paystack webhook
app.post('/webhooks/paystack', async (req: any, reply: any) => {
  const { verifyPaystackSignature } = await import('./lib/pay.js');
  const ok = verifyPaystackSignature(req);
  if (!ok) return reply.code(401).send('Invalid signature');

  const event = req.body || {};
  const reference = event?.data?.reference || event?.data?.ref || null;
  if (reference) {
    const { getPool } = await import('./lib/db.js');
    const pool = await getPool();
    await pool.query(
      "UPDATE bookings SET payment_status='paid' WHERE paystack_ref=$1",
      [reference]
    );
  }
  reply.code(200).send('OK');
});

// Admin routes
app.register(adminRoutes, { prefix: '/admin' });

app.listen({ port: PORT, host: '0.0.0.0' }).then(() => {
  app.log.info(`Server listening on ${PORT}`);
}).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
