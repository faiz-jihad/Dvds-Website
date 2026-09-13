import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

const corsHeaders = { 'Access-Control-Allow-Origin': Deno.env.get('SITE_URL') || '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { orderId, sessionId } = await request.json();
    if (!orderId || !sessionId) throw new Error('Order verification details are missing.');
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient() });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.order_id !== orderId) return Response.json({ error: 'Order verification failed.' }, { status: 403, headers: corsHeaders });
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data, error } = await db.from('orders').select('*, items:order_items(*)').eq('id', orderId).single();
    if (error) throw error;
    return Response.json({ order: data }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Order could not be loaded.' }, { status: 400, headers: corsHeaders });
  }
});
