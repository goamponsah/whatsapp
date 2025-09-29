// apps/server/src/lib/pay.ts
import { request } from 'undici';
import crypto from 'crypto';
import type { FastifyRequest } from 'fastify';

/**
 * Create a Paystack payment initialization and return the hosted payment URL + reference.
 * @param email   Customer email
 * @param amount  Amount in base subunits (e.g., kobo/pesewas) per your Paystack currency settings
 * @param metadata Optional metadata object (will appear in Paystack dashboard/webhook)
 */
export async function createPaystackLink(
  email: string,
  amount: number,
  metadata: Record<string, any> = {}
): Promise<{ url: string; reference: string }> {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error('Missing PAYSTACK_SECRET_KEY');

  const res = await request('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, amount, metadata }),
  });

  const body = (await res.body.json()) as any;

  // Paystack returns { status: true/false, data: {...} }
  if (res.statusCode >= 300 || !body?.status || !body?.data?.authorization_url || !body?.data?.reference) {
    throw new Error('Paystack init failed: ' + JSON.stringify(body));
  }

  return {
    url: body.data.authorization_url as string,
    reference: body.data.reference as string,
  };
}

/**
 * Verify Paystack webhook HMAC using X-Paystack-Signature.
 * - Paystack signs the **raw request body** with sha512 using your secret key.
 * - We capture req.rawBody in app.ts (onRequest hook) to ensure exact bytes.
 * @returns boolean true if signature is valid
 */
export function verifyPaystackSignature(req: FastifyRequest): boolean {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY || '';
    if (!secret) return false;

    const headerSig = (req.headers['x-paystack-signature'] as string) || '';
    if (!headerSig) return false;

    // Prefer the raw body we buffered in app.ts; fall back to JSON-stringified body (best effort).
    // NOTE: Using rawBody is important—JSON serialization differences can break HMAC.
    const rawBody: string =
      (req as any).rawBody && typeof (req as any).rawBody === 'string'
        ? (req as any).rawBody
        : JSON.stringify((req as any).body ?? {});

    const digest = crypto.createHmac('sha512', secret).update(rawBody, 'utf8').digest('hex');

    // Use timingSafeEqual only if buffers are equal length; otherwise short-circuit false.
    const a = Buffer.from(digest);
    const b = Buffer.from(headerSig);

    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
