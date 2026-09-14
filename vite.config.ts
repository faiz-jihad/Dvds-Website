import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();

const devApiPlugin = () => ({
  name: 'dev-api-server',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      // Helper to parse JSON body
      const getJsonBody = () =>
        new Promise((resolve) => {
          let body = '';
          req.on('data', (chunk: any) => (body += chunk));
          req.on('end', () => {
            try {
              resolve(JSON.parse(body || '{}'));
            } catch {
              resolve({});
            }
          });
        });

      // 1. Stripe Create Checkout Session
      if (req.url?.startsWith('/api/create-checkout-session') && req.method === 'POST') {
        try {
          const data: any = await getJsonBody();
          const stripeKey = process.env.STRIPE_SECRET_KEY;
          if (!stripeKey) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: 'STRIPE_SECRET_KEY is missing in .env' }));
          }
          const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
          const amountInPence = Math.round(Number(data.totalAmount || 15) * 100);
          const orderId = data.orderId || 'ord_' + Math.random().toString(36).substring(2, 10);
          const origin = req.headers.origin || 'http://localhost:3000';
          const orderNumber = `AZ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random()
            .toString(36)
            .substring(2, 7)
            .toUpperCase()}`;

          const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            customer_email: data.customerEmail || undefined,
            line_items: [
              {
                price_data: {
                  currency: 'gbp',
                  product_data: {
                    name: `AZ Rayan DVDs Order: ${orderNumber}`,
                    description: `${data.items?.length || 1} titles — Free UK Tracked Delivery`,
                  },
                  unit_amount: amountInPence,
                },
                quantity: 1,
              },
            ],
            metadata: {
              order_id: orderId,
              order_number: orderNumber,
              delivery_tier: 'standard',
              free_shipping: 'true',
            },
            success_url: `${origin}/order-success/${orderId}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/checkout?cancelled=1`,
          });
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ url: session.url, orderId, orderNumber }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: err.message || 'Stripe error' }));
        }
      }

      // 2. Stripe Verify Session
      if (req.url?.startsWith('/api/verify-stripe-payment') && req.method === 'POST') {
        try {
          const data: any = await getJsonBody();
          const stripeKey = process.env.STRIPE_SECRET_KEY;
          if (!stripeKey) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: 'STRIPE_SECRET_KEY is missing' }));
          }
          const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
          const session = await stripe.checkout.sessions.retrieve(data.sessionId);
          const isPaid = session.payment_status === 'paid';
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          return res.end(
            JSON.stringify({
              verified: isPaid,
              orderId: data.orderId || session.metadata?.order_id,
              payment_status: isPaid ? 'paid' : session.payment_status,
              paid_at: isPaid ? new Date().toISOString() : null,
              payment_reference: session.payment_intent || session.id,
            })
          );
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: err.message }));
        }
      }

      // 3. PayPal Create Order
      if (req.url?.startsWith('/api/create-paypal-order') && req.method === 'POST') {
        try {
          const data: any = await getJsonBody();
          const orderId = data.orderId || 'ord_' + Math.random().toString(36).substring(2, 10);
          const orderNumber = `AZ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random()
            .toString(36)
            .substring(2, 7)
            .toUpperCase()}`;
          const origin = req.headers.origin || 'http://localhost:3000';

          const clientId = process.env.PAYPAL_CLIENT_ID;
          const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

          if (!clientId || !clientSecret) {
            // Simulated local redirect when PayPal keys are not yet provided
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(
              JSON.stringify({
                url: `${origin}/order-success/${orderId}?paypal_simulated=1&token=SIMULATED_${orderNumber}`,
                orderId,
                orderNumber,
                paypalOrderId: `SIM_${orderNumber}`,
              })
            );
          }

          // Call official PayPal Sandbox API
          const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
          const tokenRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
            method: 'POST',
            headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'grant_type=client_credentials',
          });
          const tokenData = await tokenRes.json();
          const ppRes = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              intent: 'CAPTURE',
              purchase_units: [
                {
                  reference_id: orderNumber,
                  amount: { currency_code: 'GBP', value: Number(data.totalAmount || 15).toFixed(2) },
                },
              ],
              application_context: {
                brand_name: 'AZ Rayan DVDs',
                locale: 'en-GB',
                user_action: 'PAY_NOW',
                return_url: `${origin}/order-success/${orderId}?paypal=1&token=${orderId}`,
                cancel_url: `${origin}/checkout?cancelled=1`,
              },
            }),
          });
          const ppOrder = await ppRes.json();
          const approveLink = (ppOrder.links || []).find((l: any) => l.rel === 'approve');
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ url: approveLink?.href, orderId, orderNumber, paypalOrderId: ppOrder.id }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: err.message }));
        }
      }

      // 4. PayPal Capture Order
      if (req.url?.startsWith('/api/capture-paypal-order') && req.method === 'POST') {
        try {
          const data: any = await getJsonBody();
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          return res.end(
            JSON.stringify({
              verified: true,
              payment_status: 'paid',
              paid_at: new Date().toISOString(),
              captureId: data.paypalOrderId || 'PP-CAP-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
              orderId: data.orderId,
            })
          );
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: err.message }));
        }
      }

      // 5. Create Bank Transfer Order
      if (req.url?.startsWith('/api/create-bank-transfer-order') && req.method === 'POST') {
        try {
          const data: any = await getJsonBody();
          const orderId = data.orderId || 'ord_' + Math.random().toString(36).substring(2, 10);
          const orderNumber = `AZ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random()
            .toString(36)
            .substring(2, 7)
            .toUpperCase()}`;
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          return res.end(
            JSON.stringify({
              success: true,
              orderId,
              orderNumber,
              payment_status: 'awaiting_payment',
              total: data.totalAmount,
            })
          );
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: err.message }));
        }
      }

      next();
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), devApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          data: ['@supabase/supabase-js', '@tanstack/react-query', 'zustand'],
          animations: ['framer-motion', 'gsap'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  server: {
    port: 3000,
  },
});
