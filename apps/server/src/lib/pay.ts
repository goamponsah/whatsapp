import { request } from 'undici';

/**
 * Initialize a Paystack payment link.
 * @param amount in kobo/pesewas depending on currency; adjust as needed
 */
export async function createPaystackLink(email: string, amount: number, metadata: Record<string, any> = {}) {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error('Missing PAYSTACK_SECRET_KEY');

  const res = await request('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      amount,
      metadata
    })
  });

  const body = await res.body.json();
  if (res.statusCode >= 300 || !body?.status) {
    throw new Error('Paystack init failed: ' + JSON.stringify(body));
  }
  return { url: body.data.authorization_url, reference: body.data.reference };
}


import crypto from 'crypto';
import type { FastifyRequest } from 'fastify';

/** Verify Paystack webhook HMAC using X-Paystack-Signature (sha512 of raw body). */
export function verifyPaystackSignature(req: FastifyRequest): boolean {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY || '';
    if (!secret) return false;
    const sig = (req.headers['x-paystack-signature'] as string) || '';
    // Try to use raw body if available; otherwise fall back to JSON stringification
    const rawBody = (req as any).rawBody ? (req as any).rawBody : JSON.stringify(req.body || {});
    const hash = crypto.createHmac('sha512', secret).update(rawBody, 'utf8').digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(sig));
  } catch {
    return false;
  }
}
