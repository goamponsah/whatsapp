import crypto from 'crypto';

export function verifyMetaSignature(req: any): boolean {
  const signature = req.headers['x-hub-signature-256'];
  const appSecret = process.env.META_APP_SECRET;
  if (!signature || !appSecret) return true; // allow in dev without secret
  const body = typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.body || {});
  const hmac = crypto.createHmac('sha256', appSecret).update(body, 'utf8').digest('hex');
  const expected = `sha256=${hmac}`;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
