# DVDs Zone

A premium physical media e-commerce platform built with React 19, TypeScript, Vite, Supabase, Stripe Hosted Checkout, PayPal, and automated business intelligence. Featuring curated physical films and box sets (DVD, Blu-ray, 4K UHD), real-time inventory management, isolated transactional email subsystems (Customer Receipts & Admin Business Reports), and an interactive customer account portal.

---

## Key Features & Architecture

### 1. Storefront & Physical Media Curation
- **Cinematic Catalogue & Exploration**: Browse physical media releases by format (DVD, Blu-ray, 4K UHD), category, decade, and genre.
- **Real-Time Search**: Instant live search engine with price, availability filters, and sorting.
- **Comprehensive Product Metadata**: In-depth physical release details (Aspect Ratio, Audio Format, Subtitles, Region Code, BBFC Rating, Special Features).
- **Wishlist & Cart**: Persistent shopping cart with dynamic subtotal calculations and promotional coupon support.

### 2. Customer Portal & Account Management
- **Customer Authentication**: Secure registration, login, and profile self-service.
- **Saved Address Book**:
  - Full CRUD management (Add, edit, delete with confirmation modal).
  - One-click **Set as Default** selection.
  - Automated UK postal code validation.
  - Express integration with checkout for one-click address selection.
  - Scoped storage resilience fallback when offline.
- **Order History**:
  - Real-time search across historical purchases by Order Reference or title.
  - Filter by status: *All*, *In Progress*, *Delivered*, and *Awaiting Payment*.
  - Official **Royal Mail** parcel tracking integration with copy-to-clipboard tracking numbers.
  - Item thumbnails, itemised pricing, and 1-click **Buy Again** reordering.

### 3. Visual Order Status Stepper
- **Interactive Tracking**: 5-stage visual progress stepper (*Order Confirmed*, *Payment Verified*, *Processing & Packing*, *Dispatched*, *Delivered*).
- **Smooth Animations**: Powered by `framer-motion` with status transitions and carrier details.
- Displayed on order confirmation (`/order-success/:id`) and customer order history (`/account/orders`).

### 4. Official Printable Receipts & Invoices
- **Official Invoices**: Includes company registration details, order reference `#ORD-XXXX`, payment status (`PAID`), product breakdown, and barcode.
- **One-Click Actions on Order Success**:
  - **"Print Receipt"** opens native browser print dialogue (*Print / Save as PDF*).
  - **"Preview Receipt"** displays an interactive A4 modal with print preview.
  - Keyboard shortcut **Ctrl+P / Cmd+P** triggers isolated receipt printing.
- **Clean Print Isolation (@media print)**: Utilises `#print-only-container` to automatically hide navigation chrome, modals, and buttons, guaranteeing pristine A4 output.

### 5. Isolated Email Subsystems (Customer Receipts vs Admin Reports)
- **Customer Payment Receipts**:
  - Automatically dispatched **only** after cryptographic webhook verification (`stripe.webhooks.constructEvent`).
  - Never triggered by frontend client navigation.
  - Clean, mobile-responsive layout without sensitive card numbers or CVV codes.
  - Includes a secure "View Order" link and idempotency tracking via `email_logs`.
- **Admin Business Intelligence Reports**:
  - Aggregated performance summaries dispatched on schedule (Weekly on Monday, Monthly on the 1st).
  - Summarises Gross Revenue, Order Volume, AOV, Units Sold, Top Titles, and Operating Expenditure.
  - Transparent accounting separation between **Net Revenue After Recorded Expenses** and **Estimated Profit**.
  - See [docs/EMAIL_AND_REPORTS_SYSTEM.md](docs/EMAIL_AND_REPORTS_SYSTEM.md) for full details.

### 6. Backoffice & Administration (/admin)
- **Role-Based Access Control**: Secure access restricted to `admin` and `staff` roles via Supabase Row-Level Security.
- **Financial Reports (`/admin/reports`)**:
  - Business performance dashboard with date presets (*This Week*, *Last Week*, *This Month*, *Last Month*, *Custom*).
  - Categorised expense tracking (*Shipping*, *Packaging*, *Payment Fees*, *Inventory*, *Marketing*, *Hosting*).
  - Report dispatch history with manual *Resend* capability for failed dispatches.
  - *Trigger Report Now* button for instant report generation.
- **Catalogue & Inventory**: Atomic inventory adjustments with audit trail reasons and non-destructive archiving.
- **Order Fulfilment**: Status progression, Royal Mail tracking injection, and dispatch notifications.
- **Promotions**: Time-restricted discount codes with minimum spend requirements and server validation.
- **Store Configuration**: Hero banners, shipping rates, same-day dispatch cutoff times, and company metadata.

### 7. Security & Payment Processing
- **Stripe & PayPal Gateways**: Server-side pricing, discounts, shipping, and inventory reservation verification.
- **Automated Stock Reservations**: Stock is reserved when a checkout session opens and released if expired or cancelled.
- **Vercel Serverless Optimisation**: Lightweight, consolidated serverless functions within hobby tier constraints.

---

## Local Development

### Prerequisites
- Node.js 20+ (Node.js 22+ or 24+ recommended)
- NPM

### Installation & Development Server

```bash
# Install dependencies
npm install

# Start local development server (Vite)
npm run dev
```

Local development server starts at `http://localhost:5173`.

### Running Tests

```bash
node --test tests/checkout.test.mjs tests/security.test.mjs tests/admin-api.test.mjs tests/reports-and-email.test.mjs
```

### Production Build

```bash
npm run build
```

---

## Environment Variables (.env)

Copy `.env.example` to `.env` and populate the following keys:

```env
# Frontend Client Public Keys
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Serverless Backend & Database Keys
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SITE_URL=https://your-site.com

# Stripe Payment Gateway
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# PayPal Payment Gateway
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_WEBHOOK_ID=your-paypal-webhook-id
PAYPAL_ENVIRONMENT=sandbox

# Email & Automated Business Reports
ADMIN_EMAIL=admin@dvdszone.co.uk
EMAIL_FROM="DVDs Zone <orders@dvdszone.co.uk>"
RESEND_API_KEY=re_xxxxxxxxxxxx
# Or: SENDGRID_API_KEY=SG.xxxxxxxxxxxx
CRON_SECRET=your-random-cron-secret-token
```

> **Security**: Never expose `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, or email API keys in variables prefixed with `VITE_`.

---

## Supabase Database Setup

1. Apply database migrations in sequential order:
   - `20260915000001_admin_reliability.sql`
   - `20260915000002_checkout_sync.sql`
   - `20261007000001_business_reports_and_expenses.sql`

2. Promote your primary administrator account via Supabase SQL Editor:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE email = 'owner@example.com';
   ```

Refer to [docs/ADMIN_VERIFICATION.md](docs/ADMIN_VERIFICATION.md) for complete verification steps.

---

## Documentation

- [docs/EMAIL_AND_REPORTS_SYSTEM.md](docs/EMAIL_AND_REPORTS_SYSTEM.md) — Comprehensive guide to customer receipts, admin reports, expense logging, and Vercel Cron.
- [docs/PAYMENT_GATEWAY_SETUP.md](docs/PAYMENT_GATEWAY_SETUP.md) — Configuration guide for Stripe, PayPal, Direct Bank Transfer, and webhook lifecycles.
- [docs/ADMIN_VERIFICATION.md](docs/ADMIN_VERIFICATION.md) — Verification of admin features, RLS policies, and database schema.
- [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md) — Cloudflare security integration and Turnstile bot protection.
- [SECURITY.md](SECURITY.md) — OWASP Top 10 mitigation, IDOR protection, CSP, and rate limiting standards.
