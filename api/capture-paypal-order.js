import { getSupabaseServerClient } from './_supabase.js';

async function getPayPalAccessToken(baseUrl, clientId, clientSecret) {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to obtain PayPal token: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return data.access_token;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const env = (process.env.PAYPAL_ENVIRONMENT || 'sandbox').toLowerCase();
  const baseUrl = env === 'live' || env === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  const { orderId, paypalOrderId } = req.body || {};
  const token = paypalOrderId || req.body?.token;

  if (!token) {
    return res.status(400).json({ error: 'Missing PayPal order token' });
  }

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'PayPal credentials not configured on server' });
  }

  try {
    const accessToken = await getPayPalAccessToken(baseUrl, clientId, clientSecret);

    const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${token}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const captureData = await captureRes.json();
    const isCompleted =
      captureData.status === 'COMPLETED' ||
      captureData.purchase_units?.[0]?.payments?.captures?.[0]?.status === 'COMPLETED';

    if (!isCompleted) {
      return res.status(400).json({
        verified: false,
        error: captureData.details?.[0]?.description || 'PayPal payment could not be captured',
      });
    }

    const captureId =
      captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id ||
      captureData.id ||
      token;
    const paidAt = new Date().toISOString();
    const supabase = getSupabaseServerClient();

    if (supabase && orderId) {
      await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          status: 'processing',
          paid_at: paidAt,
          payment_reference: captureId,
          paypal_capture_id: captureId,
          payment_provider: 'paypal',
          payment_method: 'paypal',
          updated_at: paidAt,
        })
        .eq('id', orderId);
    }

    return res.status(200).json({
      verified: true,
      payment_status: 'paid',
      paid_at: paidAt,
      captureId,
      orderId,
    });
  } catch (err) {
    console.error('[capture-paypal-order error]:', err);
    return res.status(500).json({ error: err.message || 'PayPal capture failed' });
  }
}
