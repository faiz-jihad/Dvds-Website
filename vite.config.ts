import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();

const stripeApiPlugin = () => ({
  name: 'stripe-api-dev-server',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (req.url?.startsWith('/api/create-checkout-session') && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk;
        });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
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
                      description: `${data.items?.length || 1} titles — Dispatched via Royal Mail Tracked`,
                    },
                    unit_amount: amountInPence,
                  },
                  quantity: 1,
                },
              ],
              metadata: {
                order_id: orderId,
                order_number: orderNumber,
                delivery_tier: data.deliveryTier || 'standard',
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
        });
        return;
      }
      next();
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), stripeApiPlugin()],
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
