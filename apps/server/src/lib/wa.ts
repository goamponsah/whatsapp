// apps/server/src/lib/wa.ts
import { request } from 'undici';

type Tenant = { id: string; name: string; whatsapp_number: string };

// Switch between providers: meta | twilio | sendchamp
const PROVIDER = (process.env.WA_PROVIDER || 'meta').toLowerCase();

/**
 * Unified send for plain text messages.
 * - Chooses the configured provider via WA_PROVIDER
 */
export async function sendWhatsAppText(_tenant: Tenant, to: string, text: string) {
  if (PROVIDER === 'meta') return sendViaMeta(to, text);
  if (PROVIDER === 'twilio') return sendViaTwilio(to, text);
  if (PROVIDER === 'sendchamp') return sendViaSendchamp(to, text);
  throw new Error('Unknown WA_PROVIDER: ' + PROVIDER);
}

/**
 * Simple interactive placeholder — render as text for the scaffold.
 * You can extend to native interactive messages per provider later.
 */
export async function sendWhatsAppInteractive(tenant: Tenant, to: string, interactive: any) {
  const rendered = `[interactive]\n${JSON.stringify(interactive)}`;
  return sendWhatsAppText(tenant, to, rendered);
}

// -------------------- META (WhatsApp Cloud API) --------------------

async function sendViaMeta(to: string, text: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID; // Business Phone Number ID
  if (!token || !phoneId) throw new Error('Missing WhatsApp Meta config (WHATSAPP_TOKEN, WHATSAPP_PHONE_ID)');

  const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text },
  };

  const res = await request(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (res.statusCode >= 300) {
    const body = await res.body.text();
    throw new Error(`WA(Meta) send error ${res.statusCode}: ${body}`);
  }
}

// ------------------------- TWILIO (WhatsApp) -------------------------

async function sendViaTwilio(to: string, text: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM; // e.g., 'whatsapp:+14155238886'
  if (!sid || !token || !from) throw new Error('Missing Twilio config (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM)');

  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  // Twilio requires x-www-form-urlencoded
  const params = new URLSearchParams();
  params.set('To', to.startsWith('whatsapp:') ? to : `whatsapp:${to}`);
  params.set('From', from);
  params.set('Body', text);

  const res = await request(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (res.statusCode >= 300) {
    const body = await res.body.text();
    throw new Error(`WA(Twilio) send error ${res.statusCode}: ${body}`);
  }
}

// --------------------------- SENDCHAMP ---------------------------

async function sendViaSendchamp(to: string, text: string) {
  const key = process.env.SENDCHAMP_API_KEY;
  const sender = process.env.SENDCHAMP_SENDER; // e.g., your registered sender name
  if (!key || !sender) throw new Error('Missing Sendchamp config (SENDCHAMP_API_KEY, SENDCHAMP_SENDER)');

  const url = 'https://api.sendchamp.com/api/v1/message/send';
  const payload = {
    to: [to],
    message: text,
    sender_name: sender,
    route: 'dnd', // adjust based on your account/WhatsApp route
  };

  const res = await request(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (res.statusCode >= 300) {
    const body = await res.body.text();
    throw new Error(`WA(Sendchamp) send error ${res.statusCode}: ${body}`);
  }
}
