import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('SITE_URL') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const siteUrl = Deno.env.get('SITE_URL');
  if (!stripeKey || !supabaseUrl || !serviceKey || !siteUrl) {
    return Response.json({ error: 'Checkout service is not configured.' }, { status: 503, headers: corsHeaders });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient() });
  const db = createClient(supabaseUrl, serviceKey);
  let orderId: string | null = null;
  let inventoryReserved = false;

  try {
    const { items, customerEmail, shippingAddress, deliveryTier, promoCode } = await request.json();
    if (!Array.isArray(items) || items.length === 0 || !customerEmail || !shippingAddress) throw new Error('Invalid checkout payload.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(customerEmail)) || String(customerEmail).length > 254) throw new Error('A valid email address is required.');
    if (!['standard', 'express'].includes(deliveryTier)) throw new Error('Invalid delivery tier.');
    for (const field of ['full_name', 'address_line_1', 'city', 'postcode', 'country']) {
      if (!String(shippingAddress[field] || '').trim() || String(shippingAddress[field]).length > 200) throw new Error(`Invalid shipping address field: ${field}.`);
    }
    if (items.some((item) => !item.product_id || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20)) throw new Error('Invalid item quantity.');

    const productIds = [...new Set(items.map((item) => item.product_id))];
    const { data: products, error: productError } = await db.from('products').select('id,title,sku,price,stock_quantity,cover_image_url,status').in('id', productIds);
    if (productError || !products || products.length !== productIds.length) throw new Error('One or more products are unavailable.');

    const { data: settings } = await db.from('store_settings').select('free_shipping_threshold,standard_shipping_fee,express_shipping_fee,deal_product_id,deal_discount_price,deal_ends_at,deal_is_active').limit(1).maybeSingle();
    if (!settings) throw new Error('Shipping settings are not configured.');
    const dealEndsAt = settings.deal_ends_at ? Date.parse(settings.deal_ends_at) : 0;
    const dealIsLive = Boolean(settings.deal_is_active && Date.now() < dealEndsAt && Number(settings.deal_discount_price) > 0);
    const effectivePrices = new Map<string, number>();

    let subtotal = 0;
    for (const item of items) {
      const product = products.find((row) => row.id === item.product_id);
      if (!product || product.status !== 'active' || product.stock_quantity < item.quantity) throw new Error(`Insufficient stock for ${product?.title || 'a selected product'}.`);
      const effectivePrice = dealIsLive && product.id === settings.deal_product_id
        ? Math.min(Number(product.price), Number(settings.deal_discount_price))
        : Number(product.price);
      effectivePrices.set(product.id, effectivePrice);
      subtotal += effectivePrice * item.quantity;
    }

    const shipping = deliveryTier === 'express' ? Number(settings.express_shipping_fee) : subtotal >= Number(settings.free_shipping_threshold) ? 0 : Number(settings.standard_shipping_fee);

    let discount = 0;
    if (promoCode) {
      const now = new Date().toISOString();
      const { data: promo } = await db.from('promotions').select('*').eq('code', String(promoCode).toUpperCase()).eq('is_active', true).lte('starts_at', now).or(`ends_at.is.null,ends_at.gte.${now}`).maybeSingle();
      if (!promo) throw new Error('Promotion code is invalid or inactive.');
      if (subtotal < Number(promo.minimum_order)) throw new Error(`Promotion requires a minimum basket of £${Number(promo.minimum_order).toFixed(2)}.`);
      discount = promo.type === 'percentage' ? subtotal * Number(promo.value) / 100 : Number(promo.value);
      discount = Math.min(discount, subtotal);
    }

    const total = Math.max(0.5, subtotal + shipping - discount);
    const authorization = request.headers.get('Authorization');
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
    const { data: userData } = token ? await db.auth.getUser(token) : { data: { user: null } };
    const orderNumber = `AZ-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const { data: order, error: orderError } = await db.from('orders').insert({
      order_number: orderNumber, email: customerEmail, status: 'pending', payment_status: 'unpaid', fulfilment_status: 'unfulfilled',
      user_id: userData.user?.id || null, subtotal, shipping_amount: shipping, discount_amount: discount, total_amount: total, currency: 'GBP', shipping_address: shippingAddress,
    }).select('id').single();
    if (orderError || !order) throw new Error('Order could not be initialized.');
    orderId = order.id;

    const orderItems = items.map((item) => {
      const product = products.find((row) => row.id === item.product_id)!;
      const unitPrice = effectivePrices.get(product.id)!;
      return { order_id: order.id, product_id: product.id, product_title: product.title, product_sku: product.sku, quantity: item.quantity, unit_price: unitPrice, total_price: unitPrice * item.quantity, product_snapshot: { cover_image_url: product.cover_image_url } };
    });
    const { error: itemError } = await db.from('order_items').insert(orderItems);
    if (itemError) throw new Error('Order lines could not be initialized.');
    const { error: reserveError } = await db.rpc('reserve_order_inventory', { p_order_id: order.id });
    if (reserveError) throw new Error(reserveError.message);
    inventoryReserved = true;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment', customer_email: customerEmail,
      line_items: [{ price_data: { currency: 'gbp', product_data: { name: `AZ Rayan DVDs order ${orderNumber}` }, unit_amount: Math.round(total * 100) }, quantity: 1 }],
      metadata: { order_id: order.id }, payment_intent_data: { metadata: { order_id: order.id } },
      success_url: `${siteUrl}/order-success/${order.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout?cancelled=1`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });
    await db.from('orders').update({ payment_reference: session.id }).eq('id', order.id);
    return Response.json({ url: session.url }, { headers: corsHeaders });
  } catch (error) {
    if (orderId) {
      if (inventoryReserved) await db.rpc('release_order_inventory', { p_order_id: orderId });
      else await db.from('orders').delete().eq('id', orderId);
    }
    return Response.json({ error: error instanceof Error ? error.message : 'Checkout failed.' }, { status: 400, headers: corsHeaders });
  }
});
