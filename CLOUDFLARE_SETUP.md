# Cloudflare Edge Security Architecture & Setup Guide — AZ Rayan DVDs

This document establishes the end-to-end configuration for positioning **Cloudflare** in front of the **AZ Rayan DVDs** application infrastructure. It clearly separates **automated code changes already completed** from **manual Cloudflare dashboard configuration** required during live domain onboarding.

---

## 1. Cloudflare Target Architecture

```
[ Customer / Browser ]
         │
         ▼  (HTTPS / TLS 1.3 - Encrypted)
┌─────────────────────────────────────────────────────────┐
│                    CLOUDFLARE EDGE                      │
│  - Anycast DDoS Mitigation                              │
│  - Web Application Firewall (WAF) & Managed Rules       │
│  - Edge Rate Limiting (/login, /register, /api/*)       │
│  - Bot Management & Turnstile Challenges                │
│  - Edge Static Asset Caching (Bypass dynamic routes)    │
│  - Stripe / PayPal Webhook Exemption Filter             │
└─────────────────────────────────────────────────────────┘
         │
         ▼  (HTTPS / Full Strict - Encrypted)
┌─────────────────────────────────────────────────────────┐
│              VERCEL ORIGIN (Frontend & APIs)            │
│  - React SPA Storefront (Vite Static Bundle)            │
│  - Serverless Node API Functions (/api/*)               │
│  - Native Sliding-Window Limiter (CF-Connecting-IP)     │
│  - Security Headers (CSP, HSTS, COOP, nosniff)          │
└─────────────────────────────────────────────────────────┘
         │
         ├───▶ [ Supabase Database / Auth / RLS ]
         └───▶ [ Stripe & PayPal Gateways ]
```

---

## 2. Automated Code & Repository Changes (Completed)

The following code-level enhancements are already integrated into the codebase:

1. **Native Cloudflare IP Extraction (`api/_rate-limit.js`)**:
   - `getClientIp(req)` extracts `CF-Connecting-IP` provided by the Cloudflare edge proxy before falling back to `X-Forwarded-For`. This guarantees that in-memory rate limiting and audit logging always evaluate true visitor IPs rather than forged proxy headers.
2. **CSP Compatibility (`vercel.json`)**:
   - `Content-Security-Policy` permits `https://challenges.cloudflare.com` and `https://static.cloudflareinsights.com` in `script-src` and `frame-src`. This ensures Cloudflare Managed Challenges and Turnstile widgets render without browser policy blocking.
3. **Turnstile Verification Helper & Endpoint (`api/_turnstile.js` & `api/verify-turnstile.js`)**:
   - Implements server-side token validation against Cloudflare's `siteverify` API endpoint. Runs in non-blocking mode if credentials are unconfigured, ensuring backward compatibility in local dev.
4. **Environment Reference (`.env.example`)**:
   - Documented placeholders for `VITE_CLOUDFLARE_TURNSTILE_SITE_KEY`, `CLOUDFLARE_TURNSTILE_SECRET_KEY`, `CLOUDFLARE_ZONE_ID`, and `CLOUDFLARE_API_TOKEN`.

---

## 3. Manual Cloudflare Dashboard Configuration (Step-by-Step)

Follow these steps in the [Cloudflare Dashboard](https://dash.cloudflare.com/) when connecting the domain `azrayan.co.uk`.

### Step 1: DNS Configuration
1. In Cloudflare, add the site `azrayan.co.uk` (select the Free or Pro plan).
2. Review scanned DNS records. Point the production hostnames to Vercel:

| Type | Name | Content / Target | Proxy Status | TTL |
|---|---|---|---|---|
| **A** | `@` (`azrayan.co.uk`) | `76.76.21.21` | **Proxied (Orange Cloud)** | Auto |
| **CNAME** | `www` | `cname.vercel-dns.com` | **Proxied (Orange Cloud)** | Auto |

> [!IMPORTANT]
> Keep internal records (such as MX records for email, TXT verification records, and SPF/DKIM) unproxied (DNS Only / Grey Cloud).

3. Update nameservers at your domain registrar (e.g. GoDaddy, Namecheap, 123 Reg) to the two Cloudflare nameservers assigned to your account.

---

### Step 2: SSL/TLS Configuration (Preventing Redirect Loops)
1. Go to **SSL/TLS** > **Overview**.
2. Select **Full (Strict)** encryption mode.
   - *Rationale:* Vercel terminates SSL with a valid Let's Encrypt certificate. Using "Flexible" causes an infinite redirect loop between Cloudflare (HTTP:80) and Vercel (HTTPS:443). **Full (Strict)** ensures encrypted origin transport with certificate validation.
3. Go to **SSL/TLS** > **Edge Certificates**:
   - **Always Use HTTPS**: `ON`
   - **Minimum TLS Version**: `TLS 1.2` (or `TLS 1.3`)
   - **Opportunistic Encryption**: `ON`
   - **TLS 1.3**: `ON`
   - **Automatic HTTPS Rewrites**: `ON`

---

### Step 3: Web Application Firewall (WAF) & Managed Rules
1. Navigate to **Security** > **WAF** > **Managed Rules**.
2. Enable **Cloudflare Managed Ruleset** (sets defense against OWASP Top 10, SQL Injection, and Remote Code Execution).
3. Set sensitivity to **Medium** or **High**.

#### Critical: Stripe & PayPal Webhook Exemption Rule
Cloudflare must never challenge or block incoming payment webhooks from Stripe and PayPal.
1. Go to **Security** > **WAF** > **Custom Rules** > **Create Rule**.
2. **Rule Name**: `Allow Payment Provider Webhooks`
3. **Expression**:
   ```
   (http.request.uri.path in {"/api/stripe-webhook" "/api/paypal-webhook"})
   ```
4. **Action**: `Skip`
   - Select: *WAF Managed Rules*, *Rate Limiting*, and *Bot Management / Challenge*.

---

### Step 4: Edge Rate Limiting Rules
Configure Cloudflare WAF Rate Limiting rules to protect sensitive endpoints before traffic reaches Vercel:

1. **Authentication Endpoint Rate Limiting**:
   - **Rule Name**: `Protect Customer & Admin Login`
   - **Expression**:
     ```
     (http.request.uri.path in {"/login" "/register" "/admin/login"} and http.request.method eq "POST")
     ```
   - **Rate Limit**: 10 requests per 1 minute per IP.
   - **Action**: `Managed Challenge` (or `Block` for 5 minutes).

2. **API Protection Rate Limiting**:
   - **Rule Name**: `Protect Storefront APIs`
   - **Expression**:
     ```
     (http.request.uri.path matches "^/api/" and not http.request.uri.path in {"/api/stripe-webhook" "/api/paypal-webhook"})
     ```
   - **Rate Limit**: 60 requests per 1 minute per IP.
   - **Action**: `Managed Challenge`.

---

### Step 5: Bot Protection
1. Navigate to **Security** > **Bots**.
2. Enable **Bot Fight Mode** (Free plan) or **Super Bot Fight Mode** (Pro plan).
3. Recommended settings on Pro:
   - **Definitely automated**: `Block` or `Managed Challenge`
   - **Likely automated**: `Managed Challenge`
   - **Verified bots (Google, Bing, search engines)**: `Allow`

---

### Step 6: Admin Panel Protection
Because the administration backoffice (`/admin/*`) is high-value:

#### Option A: Cloudflare Zero Trust (Access) — Recommended
1. Open the **Zero Trust** dashboard.
2. Go to **Access** > **Applications** > **Add an application**.
3. Select **Self-hosted**:
   - **Application name**: `AZ Rayan Backoffice`
   - **Domain**: `azrayan.co.uk/admin*`
4. Add an Access Policy requiring email one-time PIN (OTP) or Google Workspace authentication matching authorized staff emails (e.g. `*@azrayan.co.uk`).
5. *Note:* Application-level authentication and Supabase RLS remain active as a second layer of defense.

#### Option B: IP Restriction via WAF Rule
If staff access from static IP addresses:
1. Under **Security** > **WAF** > **Custom Rules**:
   ```
   (http.request.uri.path matches "^/admin" and not ip.src in {YOUR_OFFICE_IP})
   ```
2. **Action**: `Block` (or `Managed Challenge`).

---

### Step 7: Edge Caching Rules (Performance + Safety)
To prevent customer data leakage while accelerating static browsing:

1. Navigate to **Caching** > **Cache Rules** > **Create Rule**.
2. **Rule 1: Static Assets Cache**:
   - **Expression**:
     ```
     (http.request.uri.path matches "^/(assets|catalog|brand)/" or http.request.uri.path.extension in {"js" "css" "jpg" "jpeg" "png" "webp" "gif" "ico" "svg" "woff2" "woff" "mp4"})
     ```
   - **Settings**:
     - Edge Cache TTL: Override origin -> 7 days.
     - Browser Cache TTL: Respect origin.

3. **Rule 2: Dynamic & Account Bypass Cache (Never Cache)**:
   - **Expression**:
     ```
     (http.request.uri.path matches "^/(api|admin|account|orders|checkout|order-success)/" or http.request.uri.path in {"/login" "/register"})
     ```
   - **Settings**:
     - Cache Eligibility: **Bypass cache**.

---

### Step 8: Origin Protection (Preventing Direct Bypasses)
To prevent malicious actors from attempting to discover Vercel deployment URLs and bypassing Cloudflare:
1. In Cloudflare, navigate to **Rules** > **Transform Rules** > **Modify Request Header**.
2. Add a custom header rule:
   - Header name: `X-Origin-Verification`
   - Value: `<generate-random-32-character-secret>`
3. In Vercel, navigate to **Settings** > **Deployment Protection**:
   - Enable protection or restrict production traffic to custom domains.

---

## 4. Verification & Testing Procedure

Perform these tests after updating DNS records to verify end-to-end operation:

| Test Item | Command / Procedure | Expected Result |
|---|---|---|
| **DNS Resolution** | `nslookup azrayan.co.uk` | Returns Cloudflare Anycast IP addresses. |
| **HTTP to HTTPS Redirect** | `curl -I http://azrayan.co.uk/` | Returns `301 Moved Permanently` to `https://`. |
| **TLS Handshake** | `curl -Iv https://azrayan.co.uk/` | Connects via TLS 1.3 with Cloudflare SNI certificate. |
| **CF Headers** | Inspect response headers | `server: cloudflare`, `cf-ray: ...`, `cf-cache-status: HIT/DYNAMIC`. |
| **Static Cache** | `curl -I https://azrayan.co.uk/assets/index-...js` | `cf-cache-status: HIT` on subsequent requests. |
| **Dynamic Bypass** | `curl -I https://azrayan.co.uk/api/order-status` | `cf-cache-status: DYNAMIC` / `Cache-Control: no-store`. |
| **Stripe Webhook** | Trigger test webhook in Stripe Dashboard | Returns HTTP 200 without challenge interception. |
| **PayPal Webhook** | Trigger simulator in PayPal Developer Portal | Returns HTTP 200 without challenge interception. |
| **Login & Checkout** | Full browser journey on desktop & mobile | Smooth cart addition, auth, and checkout. |

---

## 5. Rollback Procedure

If unexpected network behavior or configuration issues occur:
1. **Instant Cloudflare Bypass (Development Mode)**:
   - In Cloudflare Dashboard, go to **Caching** > **Configuration** > Toggle **Development Mode** to `ON` (bypasses cache instantly).
2. **Pause Cloudflare on Site**:
   - In Cloudflare Dashboard, scroll to bottom right of **Overview** > Click **Pause Cloudflare on Site**.
   - Traffic routes directly to Vercel origin while keeping DNS operational.
3. **Full DNS Rollback**:
   - Change your domain's nameservers at your registrar back to your previous registrar/Vercel nameservers.
