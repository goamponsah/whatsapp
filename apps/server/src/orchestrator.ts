import { classifyIntent } from './lib/nlp.js';
import { findTenantByRecipient, logMessage } from './lib/db.js';
import { searchFAQ } from './lib/rag.js';
import { sendWhatsAppText, sendWhatsAppInteractive } from './lib/wa.js';

export async function handleMessage(msg: any, ctx: any) {
  const from = msg.from;
  const to = ctx?.metadata?.display_phone_number || ctx?.metadata?.phone_number_id;
  const text = msg.text?.body ?? msg.button?.text ?? '';

  const tenant = await findTenantByRecipient(to);
  if (!tenant) {
    // No tenant mapping found
    return;
  }

  await logMessage(tenant.id, from, 'in', text, null, null, null);

  const intent = await classifyIntent(text);
  switch (intent.type) {
    case 'FAQ': {
      const res = await searchFAQ(tenant.id, text);
      if (!res || res.confidence < 0.6) {
        await sendWhatsAppText(tenant, from, "Thanks! A human will assist you shortly.");
        await logMessage(tenant.id, from, 'out', '[handoff]', 'handoff', 0.0, null);
        break;
      }
      await sendWhatsAppText(tenant, from, res.answer);
      await logMessage(tenant.id, from, 'out', res.answer, 'FAQ', res.confidence, 'RAG');
      break;
    }
    case 'BOOKING_START': {
      // Simple demo: echo desired date, in real impl parse and check availability
      const prompt = 'Please share your preferred date & time (e.g., 2025-10-05 14:00).';
      await sendWhatsAppText(tenant, from, prompt);
      await logMessage(tenant.id, from, 'out', prompt, 'BOOKING_START', 0.9, null);
      break;
    }
    case 'PAYMENT_REQUEST': {
      const msg = 'Payment link will be provided after booking confirmation.';
      await sendWhatsAppText(tenant, from, msg);
      await logMessage(tenant.id, from, 'out', msg, 'PAYMENT_REQUEST', 0.9, null);
      break;
    }
    default: {
      const fallback = "I didn’t quite get that. You can ask about pricing, hours, or make a booking.";
      await sendWhatsAppText(tenant, from, fallback);
      await logMessage(tenant.id, from, 'out', fallback, 'SMALLTALK', 0.4, null);
    }
  }
}
