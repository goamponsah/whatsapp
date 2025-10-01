// apps/server/src/app.ts
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';

// If you have admin routes, we import and register them below
// (make sure the compiled file will be at dist/src/routes/admin.js)
import adminRoutes from './routes/admin.js';

// --- Fastify instance ---
const app = Fastify({
  logger: true
});

// --- CORS (open by default; tighten if needed) ---
await app.register(cors, {
  origin: true
});

// --- URL-encoded form parser (for simple forms) ---
await app.register(formbody);

// --- Capture raw JSON body (needed for Paystack signature verify) ---
app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  try {
    (req as any).rawBody = body || '';
    const json = body ? JSON.parse(body) : {};
    done(null, json);
  } catch (err) {
    done(err as Error, undefined as any);
  }
});

// --- Health check ---
app.get('/health', async () => {
  return { ok: true };
});

// --- WhatsApp webhook: verification (GET) ---
app.get('/webhooks/whatsapp', async (req, reply) => {
  const q = (req.query ?? {}) as Record<string, string>;
  const mode = q['hub.mode'];
  const token = q['hub.verify_token'];
  const challenge = q['hub.challenge'];

  if (mode === 'subscribe' && token && challenge && token === process.env.META_VERIFY_TOKEN) {
    // Meta expects the challenge echoed verbatim with 200
    reply.code(200).type('text/plain').send(challenge);
    return;
  }
  reply.code(403).send('Forbidden');
});

// --- WhatsApp webhook: events (POST) ---
app.post('/webhooks/whatsapp', async (req, reply) => {
  // You can process the payload here or enqueue it; for now we just log minimal info
  app.log.info({ path: '/webhooks/whatsapp', body: req.body }, 'WA inbound');
  reply.code(200).send({ ok: true });
});

// --- Paystack webhook (optional example) ---
// Keep this route if you’re verifying HMAC in lib/pay.ts using req.rawBody
app.post('/webhooks/paystack', async (req, reply) => {
  try {
    const { verifyPaystackSignature } = await import('./lib/pay.js');
    if (!verifyPaystackSignature(req)) {
      return reply.code(401).send({ ok: false, error: 'invalid signature' });
    }
    // TODO: handle event (update bookings by paystack_ref, etc.)
    app.log.info({ evt: req.body }, 'Paystack webhook ok');
    return reply.send({ ok: true });
  } catch (e) {
    app.log.error(e);
    return reply.code(500).send({ ok: false });
  }
});

// --- Mount admin API under /admin (only if the file exists) ---
await app.register(adminRoutes as any, { prefix: '/admin' });

// --- Optional: simple root route so / doesn’t 404 ---
app.get('/', async () => {
  return { ok: true, service: 'whatsapp-agent-server', version: '0.1.0' };
});

// --- Start server when executed directly ---
const PORT = Number(process.env.PORT || 8080);
const HOST = '0.0.0.0';

try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`Server listening on http://${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

export default app;
