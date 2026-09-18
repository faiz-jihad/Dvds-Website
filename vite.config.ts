import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const devApiPlugin = () => ({
  name: 'dev-api-server',
  configureServer(server: any) {
    const endpoints = new Set(['checkout-quote', 'cancel-checkout', 'create-checkout-session', 'create-paypal-order', 'create-bank-transfer-order', 'upload-payment-proof', 'order-status', 'verify-stripe-payment', 'capture-paypal-order', 'stripe-webhook', 'paypal-webhook']);
    server.middlewares.use(async (req: any, res: any, next: any) => {
      const route = req.url?.split('?')[0]?.replace('/api/', '');
      if (!req.url?.startsWith('/api/') || !endpoints.has(route)) return next();
      dotenv.config({ override: true });
      res.status = (code: number) => { res.statusCode = code; return res; };
      res.json = (value: unknown) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); };
      try {
        if (route !== 'stripe-webhook') {
          let body = '';
          for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 1024 * 1024) return res.status(413).json({ error: 'Request too large' }); }
          try { req.body = JSON.parse(body || '{}'); }
          catch { return res.status(400).json({ error: 'Invalid JSON' }); }
        }
        const module = await server.ssrLoadModule(`/api/${route}.js`);
        await module.default(req, res);
      } catch (error: any) {
        console.error('[dev-api]', error.message);
        if (!res.headersSent) res.status(500).json({ error: 'Checkout service is unavailable.' });
      }
    });
  },
});

const lenisModulePath = fs.existsSync(path.resolve(__dirname, 'node_modules/@studio-freight/lenis'))
  ? '@studio-freight/lenis'
  : path.resolve(__dirname, './src/lib/lenis-shim.ts');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), devApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'motion/react': 'framer-motion',
      '@studio-freight/lenis': lenisModulePath,
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
