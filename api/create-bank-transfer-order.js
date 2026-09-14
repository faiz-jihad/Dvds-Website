import { getSupabaseServerClient } from './_supabase.js';

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

  try {
    const { items, customerEmail, shippingAddress, promoCode } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items in basket.' });
    }

    const supabase = getSupabaseServerClient();

    // 1. Calculate trusted pricing
    let trustedSubtotal = 0;
    const validatedItems = [];
    const productIds = items.map((i) => i.product_id || i.id).filter(Boolean);
    let dbProducts = [];

    if (supabase && productIds.length > 0) {
      const { data } = await supabase.from('products').select('*').in('id', productIds);
      if (data) dbProducts = data;
    }

    for (const item of items) {
      const pId = item.product_id || item.id;
      const dbProd = dbProducts.find((p) => p.id === pId);
      const unitPrice = dbProd ? Number(dbProd.price) : Number(item.unit_price || item.price || 9.99);
      const title = dbProd ? dbProd.title : (item.product_title || item.title || 'Collector Edition DVD');
      const sku = dbProd?.sku || item.product_sku || item.sku || 'AZ-DVD';
      const coverUrl = dbProd?.cover_image_url || item.cover_image_url;
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const lineTotal = unitPrice * qty;
      trustedSubtotal += lineTotal;

      validatedItems.push({
        product_id: pId,
        product_title: title,
        product_sku: sku,
        quantity: qty,
        unit_price: unitPrice,
        total_price: lineTotal,
        cover_image_url: coverUrl,
      });
    }

    let discountAmount = 0.0;
    if (promoCode && supabase) {
      const cleanCode = String(promoCode).trim().toUpperCase();
      const { data: promo } = await supabase
        .from('promotions')
        .select('*')
        .eq('code', cleanCode)
        .eq('is_active', true)
        .maybeSingle();

      if (promo && trustedSubtotal >= Number(promo.minimum_order)) {
        if (promo.type === 'percentage') {
          discountAmount = (trustedSubtotal * Number(promo.value)) / 100;
        } else {
          discountAmount = Number(promo.value);
        }
        discountAmount = Math.min(discountAmount, trustedSubtotal);
      }
    }

    // UK Delivery is FREE
    const shippingFee = 0.0;
    const trustedTotal = Math.max(0, trustedSubtotal - discountAmount + shippingFee);

    const orderId = req.body?.orderId || crypto.randomUUID();
    const orderNumber =
      req.body?.orderNumber ||
      `AZ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random()
        .toString(36)
        .substring(2, 7)
        .toUpperCase()}`;

    // 2. Insert order into Supabase
    if (supabase) {
      const { error: orderError } = await supabase.from('orders').upsert({
        id: orderId,
        order_number: orderNumber,
        email: customerEmail || 'customer@example.com',
        status: 'pending',
        payment_status: 'awaiting_payment',
        payment_method: 'bank_transfer',
        payment_provider: 'manual_bank',
        payment_reference: orderNumber,
        bank_transfer_reference: orderNumber,
        fulfilment_status: 'unfulfilled',
        subtotal: trustedSubtotal,
        shipping_amount: 0,
        discount_amount: discountAmount,
        total_amount: trustedTotal,
        currency: 'GBP',
        shipping_address: shippingAddress || {},
        updated_at: new Date().toISOString(),
      });

      if (orderError) {
        console.error('[create-bank-transfer-order] DB Error:', orderError);
        return res.status(500).json({ error: 'Failed to create order record' });
      }

      // Insert line items
      const itemsToInsert = validatedItems.map((item) => ({
        order_id: orderId,
        product_id: item.product_id,
        product_title: item.product_title,
        product_sku: item.product_sku,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        cover_image_url: item.cover_image_url,
      }));

      await supabase.from('order_items').insert(itemsToInsert);
    }

    return res.status(200).json({
      success: true,
      orderId,
      orderNumber,
      payment_status: 'awaiting_payment',
      total: trustedTotal,
    });
  } catch (err) {
    console.error('[create-bank-transfer-order error]:', err);
    return res.status(500).json({ error: err.message || 'Failed to place bank transfer order' });
  }
}
