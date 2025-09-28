import { request } from 'undici';

type Tenant = { id: string; name: string; whatsapp_number: string; };

const WA_BASE = 'https://graph.facebook.com/v20.0';
const PROVIDER = (process.env.WA_PROVIDER || 'meta').toLowerCase();

/** Unified send text via configured provider (meta|twilio|sendchamp). */
export async function sendWhatsAppText(tenant: Tenant, to: string, text: string) {
  if (PROVIDER === 'meta') return sendViaMeta(to, text);
  if (PROVIDER === 'twilio') return sendViaTwilio(to, text);
  if (PROVIDER === 'sendchamp') return sendViaSendchamp(to, text);
  throw new Error('Unknown WA_PROVIDER: ' + PROVIDER);
}

export async function sendWhatsAppInteractive(tenant: Tenant, to: string, interactive: any) {
  // For simplicity, we render as plain text in scaffold
  return sendWhatsAppText(tenant, to, '[interactive placeholder]\n' + JSON.stringify(interactive));
}

// --- Meta (WhatsApp Cloud API) ---
async function sendViaMeta(to: string, text: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) throw new Error('Missing WhatsApp config for Meta');

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text }
  };

  const res = await request(`${WA_BASE}/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (res.statusCode >= 300) {
    const body = await res.body.text();
    throw new Error(`WA(Meta) send error ${res.statusCode}: ${body}`);
  }
}

// --- Twilio (placeholder) ---
async function sendViaTwilio(to: string, text: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM; // e.g., 'whatsapp:+14155238886'
  if (!sid || !token || !from) throw new Error('Missing Twilio config');

  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const params = new URLSearchParams();
  params.set('To', to.startsWith('whatsapp:') ? to : `whatsapp:${to}`);
  params.set('From', from);
  params.set('Body', text);

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  } as any);

  if (!('ok' in res) or (res as any).status >= 300) {
    const body = await (res as any).text();
    throw new Error('WA(Twilio) send error: ' + body);
  }
}

// --- Sendchamp (placeholder) ---
async function sendViaSendchamp(to: string, text: string) {
  const key = process.env.SENDCHAMP_API_KEY;
  const sender = process.env.SENDCHAMP_SENDER;
  if (!key || !sender) throw new Error('Missing Sendchamp config');
  // Basic SMS/WhatsApp messaging - adjust endpoint if you have WhatsApp-specific plan
  const res = await fetch('https://api.sendchamp.com/api/v1/message/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: [to],
      message: text,
      sender_name: sender,
      route: 'dnd' // adjust per account capabilities
    })
  } as any);
  const status = (res as any).status || 0;
  if (status >= 300) {
    const body = await (res as any).text();
    throw new Error('WA(Sendchamp) send error: ' + body);
  }
}
