import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

serve(async (request) => {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const signature = request.headers.get('stripe-signature');
  if (!stripeKey || !webhookSecret || !signature) return new Response('Webhook is not configured', { status: 400 });

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient() });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch (error) {
    return new Response(`Invalid signature: ${error instanceof Error ? error.message : 'unknown error'}`, { status: 400 });
  }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;
    if (orderId && session.payment_status === 'paid') {
      const { error } = await db.rpc('finalize_checkout_order', { p_order_id: orderId, p_session_id: session.id });
      if (error) return new Response(error.message, { status: 500 });
    }
  }
  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.order_id) {
      const { error } = await db.rpc('release_order_inventory', { p_order_id: session.metadata.order_id });
      if (error) return new Response(error.message, { status: 500 });
    }
  }

  return Response.json({ received: true });
});
