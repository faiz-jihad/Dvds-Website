import { getSupabaseServerClient } from './_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const event = req.body;
    const eventType = event?.event_type;
    const supabase = getSupabaseServerClient();

    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      const capture = event.resource;
      const captureId = capture.id;
      const customId = capture.custom_id;

      if (supabase && (customId || captureId)) {
        const query = supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            status: 'processing',
            paid_at: new Date().toISOString(),
            payment_reference: captureId,
            paypal_capture_id: captureId,
            payment_provider: 'paypal',
            payment_method: 'paypal',
            updated_at: new Date().toISOString(),
          });

        if (customId) {
          await query.eq('id', customId);
        } else {
          await query.eq('paypal_capture_id', captureId);
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[PayPal Webhook Error]:', err);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
}
