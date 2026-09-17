# Security Architecture & Policies — AZ Rayan DVDs

This document details the security model, architectural boundaries, and hardening policies implemented across the **AZ Rayan DVDs** e-commerce platform.

---

## 1. Security Architecture Overview

AZ Rayan DVDs employs a defense-in-depth security model combining:
- **Client Tier**: React Single Page Application (SPA) built with Vite and Tailwind CSS. The client is treated as an untrusted environment: all pricing, inventory reservation, order creation, and payment verification are calculated strictly server-side.
- **Serverless API Tier**: Vercel Serverless Functions (`/api/*`) executing in Node.js. Server-side handlers enforce method restrictions, sliding-window rate limiting, input validation, and prototype pollution sanitization before executing privileged business logic.
- **Database & Identity Tier**: PostgreSQL managed via Supabase with strict Row Level Security (RLS), column-level privileges, and cryptographic functions.
- **Payment Providers Tier**: Stripe Hosted Checkout and PayPal REST API for PCI-DSS compliant transactions.

---

## 2. Authentication Model

- **Customer Authentication**:
  - Managed via Supabase Auth with secure salted and hashed passwords (`bcrypt` / `blowfish`).
  - Passwords are never accessible or stored as plaintext.
  - Social OAuth (Google) utilizes the PKCE authorization code exchange flow.
  - Auth tokens are managed using standard `localStorage` with expiry refresh handled by `@supabase/supabase-js`.
  - Customer error messages avoid account enumeration (e.g. returning generic *"Invalid email or password"*).
  - Client-side login forms enforce progressive delays and a 30-second lockout after 5 consecutive failed attempts to thwart credential stuffing.

- **Administrator Authentication**:
  - Dedicated administrative login endpoint (`/admin/login`) requiring verified roles (`admin` or `staff`) stored in `public.profiles` or server-signed `app_metadata`.
  - Client-supplied `user_metadata` is explicitly untrusted and blocked from granting admin privileges.
  - Administrative sessions expire and are revoked on sign out.

---

## 3. Authorization & Access Control (IDOR Prevention)

- **Strict Server-Side Authorization**: The frontend never determines user permissions or resource ownership.
- **Insecure Direct Object Reference (IDOR) Mitigation**:
  - Orders are linked to `user_id`. When accessing order details or status, `authorizeOrder()` validates either:
    1. The authenticated user ID matches `order.user_id`, or
    2. The caller possesses the cryptographic 32-byte guest token whose SHA-256 hash matches `order.checkout_access_hash`.
  - Attempts to inspect or modify an order with a forged or different user ID return `403 Forbidden`.
- **Administrative Access**:
  - Backoffice functionality (`/admin/*`) and administrative RPCs require `public.is_admin()` evaluation.
  - Standard customer accounts receive access denial upon querying administrative tables or attempting administrative mutations.

---

## 4. Database & Row Level Security (RLS) Approach

Row Level Security is enabled across all production tables in PostgreSQL:

| Table | Policy Name | Permitted Roles | Restriction / Predicate |
|---|---|---|---|
| `profiles` | Users can view own profile | Authenticated | `auth.uid() = id` |
| `profiles` | Admins can view all profiles | Admin / Staff | `public.is_admin()` |
| `profiles` | Users can update own profile fields | Authenticated | `auth.uid() = id` (Role alterations blocked by trigger) |
| `orders` | Customers can view their orders | Authenticated / Admin | `auth.uid() = user_id OR public.is_admin()` |
| `order_items` | Customers can view order items | Authenticated / Admin | Matches customer's order ID or admin |
| `promotions` | Public can view active promotions | Public (SELECT) | Active promotions only |
| `promotions` | Admins can manage promotions | Admin | `public.is_admin()` |
| `newsletter_subscribers` | Public can subscribe | Public (INSERT) | `INSERT WITH CHECK (TRUE)` |
| `newsletter_subscribers` | Admins can manage | Admin | `public.is_admin()` (Public reads blocked) |
| `contact_messages` | Anyone can submit | Public (INSERT) | `INSERT WITH CHECK (TRUE)` |
| `contact_messages` | Admins can manage | Admin | `public.is_admin()` |

### Role Privilege Escalation Prevention
- The `public.is_admin()` function checks only:
  1. `public.profiles.role IN ('admin', 'staff')`
  2. `auth.jwt() -> 'app_metadata' ->> 'role'` (server-only metadata)
  3. Direct server-assigned admin email
- An automated PostgreSQL trigger `protect_profile_role` prevents non-administrators from updating their own `role` column, silently reverting unauthorized role modifications even if a raw Supabase client query is attempted.

---

## 5. Payment Security Approach

- **Zero Card Data Storage**: Full credit/debit card numbers, CVV codes, and expiry dates are never transmitted to or stored on our servers. All card entry is handled inside PCI-DSS Level 1 compliant Stripe Hosted Checkout frames.
- **Authoritative Server Pricing**:
  - Prices submitted by the client browser in cart payloads are completely ignored.
  - The server queries `products.price` and `store_settings` to compute integer-pence totals.
  - Deal discounts and promotional coupons are validated server-side against expiration dates and minimum order thresholds.
- **Idempotency & Replay Protection**:
  - Each checkout attempt is assigned a UUID `requestId` and validated against a SHA-256 payload fingerprint.
  - Payment intent creations provide an `idempotencyKey` (`checkout-{order_id}`) to Stripe, preventing duplicate credit card charges.
  - Stock deductions occur atomically in a database transaction when orders transition to paid.

---

## 6. Webhook Security

- **Stripe Webhooks** (`/api/stripe-webhook`):
  - Validates the `stripe-signature` header using `stripe.webhooks.constructEvent()` against the secret `STRIPE_WEBHOOK_SECRET`.
  - Body payload size is capped at 1 MB to prevent memory exhaustion attacks.
  - Verifies that `event.metadata.order_id` matches the internal database order before updating payment status.
  - Cumulative refunds are tracked to prevent duplicate refund credits.
- **PayPal Webhooks** (`/api/paypal-webhook`):
  - Validates transmission signature headers (`paypal-transmission-id`, `paypal-transmission-sig`, etc.) with PayPal's `/v1/notifications/verify-webhook-signature` API.
  - Rejects unverified or failed verification transmissions with HTTP 400.

---

## 7. File Upload Security

- **Endpoint**: Administrative product cover media upload (`src/lib/adminMedia.ts`).
- **Strict MIME Allowlist**: Only raster formats are accepted:
  - `image/jpeg` (`.jpg`)
  - `image/png` (`.png`)
  - `image/webp` (`.webp`)
  - `image/gif` (`.gif`)
- **SVG Upload Disabled**: `image/svg+xml` is explicitly blocked to eliminate Stored Cross-Site Scripting (XSS) vectors via malicious embedded XML scripts.
- **Safe Filename Generation**: User-supplied filenames are stripped. Uploads are stored under randomly generated UUIDs (`crypto.randomUUID() + '.' + ext`).
- **File Size Limit**: Hard ceiling of 5 MB enforced before uploading to Supabase Storage.

---

## 8. Rate Limiting & Denial of Service Protection

Implemented in `api/_rate-limit.js` via a sliding-window algorithm:
- **Order / Checkout Creation**: Maximum 15 requests per minute per IP.
- **Checkout Pricing Quotes**: Maximum 30 requests per minute per IP.
- **Order Status Queries**: Maximum 60 requests per minute per IP.
- **Client Throttling**: Upon rate limit breach, endpoints respond with HTTP 429 (`RATE_LIMITED`) and include `Retry-After`, `X-RateLimit-Limit`, and `X-RateLimit-Remaining` headers.
- **Prototype Pollution Prevention**: Incoming JSON payloads are sanitized recursively to strip `__proto__`, `constructor`, and `prototype` keys.

---

## 9. Security Headers

Configured in `vercel.json` and served on all application responses:
- **Content-Security-Policy (CSP)**: Restricts executable scripts and frames strictly to self, Stripe (`js.stripe.com`), and PayPal (`www.paypal.com`), preventing script injection from untrusted CDNs.
- **Strict-Transport-Security (HSTS)**: `max-age=63072000; includeSubDomains; preload` enforces HTTPS connections.
- **X-Content-Type-Options**: `nosniff` prevents MIME-type sniffing.
- **X-Frame-Options**: `SAMEORIGIN` protects against UI redress and clickjacking.
- **Referrer-Policy**: `strict-origin-when-cross-origin` safeguards sensitive URLs from leaking in HTTP Referer headers.
- **Permissions-Policy**: Restricts unnecessary browser APIs (`camera=(), microphone=(), geolocation=()`).
- **Cross-Origin-Opener-Policy (COOP)**: `same-origin-allow-popups` ensures window isolation while supporting OAuth authentication windows.

---

## 10. Secrets & Environment Management

- **Public Variables**: Only non-sensitive configurations prefixed with `VITE_` are bundled into client assets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`).
- **Private Secrets**: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_WEBHOOK_ID` are strictly retained in serverless environments and never exposed to the frontend.
- **Version Control Safety**: `.env` and `.env.*.local` are explicitly excluded in `.gitignore`. A sanitized reference template is maintained in `.env.example` using placeholders only.

---

## 11. Reporting Security Issues

If you discover a vulnerability or security defect in AZ Rayan DVDs:
1. Please do **NOT** open a public issue on GitHub.
2. Email the security team directly at **`security@azrayan.co.uk`**.
3. Include a detailed description of the vulnerability, steps to reproduce, and proof of concept.
4. We acknowledge receipt within 24 hours and prioritize high and critical severity findings.
