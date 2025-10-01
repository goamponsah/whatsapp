// apps/server/src/app.ts
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';

// If your routes file exports `export const adminRoutes = async (app)=>{...}`
import { adminRoutes } from './routes/admin.js';

const app = Fastify({ logger: true });

// CORS (open; tighten origin if needed)
app.register(cors, { origin: true });

// x-www-form-urlencoded parser
app.register(formbody);

// Capture raw JSON for Paystack HMAC verification
app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  try {
    const raw = typeof body === 'string' ? body : Buffer.from(body as any).toString('utf8');
    (req as any).rawBody = raw || '';
    const json = raw ? JSON.parse(raw) : {};
    done(null, json);
  } catch (err) {
    done(err as Error, undefined as any);
  }
});

// Health
app.get('/health', async () => ({ ok: true }));

// Optional friendly root so GET / doesn’t 404
app.get('/', async () => ({ ok: true, service: 'whatsapp-agent-server', version: '0.1.0' }));

// WhatsApp webhook verify (GET)
app.get('/webhooks/whatsapp', async (req, reply) => {
  const q = (req.query ?? {}) as Record<string, string>;
  const mode = q['hub.mode'];
  const token = q['hub.verify_token'];
  const challenge = q['hub.challenge'];

  if (mode === 'subscribe' && token && challenge && token === process.env.META_VERIFY_TOKEN) {
    return reply.code(200).type('text/plain').send(challenge);
  }
  return reply.code(403).send('Forbidden');
});

// WhatsApp events (POST)
app.post('/webhooks/whatsapp', async (req, reply) => {
  app.log.info({ route: '/webhooks/whatsapp', body: req.body }, 'WA inbound');
  return reply.send({ ok: true });
});

// Paystack webhook (HMAC verified using req.rawBody)
app.post('/webhooks/paystack', async (req, reply) => {
  try {
    const { verifyPaystackSignature } = await import('./lib/pay.js');
    if (!verifyPaystackSignature(req)) {
      return reply.code(401).send({ ok: false, error: 'invalid signature' });
    }
    // TODO: update booking/payment by paystack_ref here
    app.log.info({ evt: req.body }, 'Paystack webhook ok');
    return reply.send({ ok: true });
  } catch (e) {
    app.log.error(e);
    return reply.code(500).send({ ok: false });
  }
});

// Mount admin API under /admin
app.register(adminRoutes as any, { prefix: '/admin' });

// Boot
const PORT = Number(process.env.PORT || 8080);
const HOST = '0.0.0.0';

async function start() {
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

export default app;
