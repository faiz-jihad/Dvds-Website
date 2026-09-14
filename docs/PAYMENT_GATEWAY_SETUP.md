# AZ Rayan DVDs — Payment Gateway & Checkout Architecture

This document provides a comprehensive operational guide for the multi-gateway payment architecture implemented for **AZ Rayan DVDs** (UK DVD E-Commerce).

---

## 1. Overview of Payment Methods

| Method | Provider | Flow Type | Payment Status Upon Creation | Fulfillment Trigger |
| :--- | :--- | :--- | :--- | :--- |
| **Credit / Debit Card** | Stripe | Stripe Hosted Checkout | `pending` | Automated upon Stripe webhook / server verification (`paid`) |
| **PayPal** | PayPal v2 | Hosted / Approval redirect | `pending` | Automated upon PayPal capture / webhook (`paid`) |
| **Bank Transfer** | Barclays Bank UK | Direct BACS / Faster Payments | `awaiting_payment` | **Manual admin confirmation** in Admin Orders panel (`paid`) |

### Core Store Policy
- **Free Delivery Across the UK**: Standard UK shipping is fixed at **£0.00** across all UK orders.
- **Currency**: British Pounds (**GBP, £**).
- **Server Price Integrity**: Product prices and line item amounts are validated against trusted database records on the server; client-submitted totals are never trusted.

---

## 2. Stripe Payment Integration

### Supported Payment Types
- Visa
- Mastercard
- American Express
- Apple Pay (where supported by customer device)
- Google Pay (where supported by customer browser)

### Server Endpoints & Handlers
- `/api/create-checkout-session`: Fetches database product pricing, computes trusted order subtotal and £0.00 UK delivery, creates a pending order record, and generates a Stripe Checkout Session URL with metadata (`order_id`, `order_number`).
- `/api/verify-stripe-payment`: Verifies the Stripe Session status directly with the Stripe API before showing confirmation.
- `/api/stripe-webhook`: Listens for `checkout.session.completed` events, verifies signature via `STRIPE_WEBHOOK_SECRET`, and idempotently marks order as `paid`, sets `paid_at`, and saves `payment_intent_id`.

### Environment Variables
```env
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

### Setting up Stripe Webhook (Production)
1. Go to your [Stripe Dashboard](https://dashboard.stripe.com/) -> **Developers** -> **Webhooks**.
2. Click **Add endpoint**.
3. Set **Endpoint URL** to `https://your-domain.com/api/stripe-webhook`.
4. Under **Events to listen to**, select:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
5. Reveal your **Signing secret** (`whsec_...`) and copy it into your Vercel or production environment variables as `STRIPE_WEBHOOK_SECRET`.

---

## 3. PayPal Integration

### Flow
1. Customer selects **PayPal** on checkout and submits order.
2. `/api/create-paypal-order` generates an order with PayPal REST API v2 using OAuth token exchange.
3. Customer is redirected to PayPal to authorize the payment.
4. Customer is redirected back to `/order-success/:id?token=...`.
5. `/api/capture-paypal-order` captures authorized funds server-side, saves `paypal_capture_id`, and marks order as `paid`.
6. `/api/paypal-webhook` listens for `CHECKOUT.ORDER.APPROVED` and `PAYMENT.CAPTURE.COMPLETED` as an asynchronous guarantee.

### Environment Variables
```env
PAYPAL_CLIENT_ID=your-client-id
PAYPAL_CLIENT_SECRET=your-client-secret
PAYPAL_ENVIRONMENT=live    # or 'sandbox' during testing
PAYPAL_WEBHOOK_ID=your-webhook-id
```

### Setting up PayPal REST App
1. Go to the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/).
2. Under **Apps & Credentials**, create a new App or select your existing App.
3. Set app type to **Merchant**.
4. Copy your **Client ID** and **Secret**.
5. Under **Webhooks**, add an endpoint: `https://your-domain.com/api/paypal-webhook` subscribing to `PAYMENT.CAPTURE.COMPLETED`.

---

## 4. Company Bank Transfer (Barclays Bank UK)

### Business Account Details
- **Account Name**: AZ Rayan Ltd
- **Bank**: Barclays Bank UK
- **Sort Code**: `20-00-00`
- **Account Number**: `13894195`
- **Payment Reference**: Customer's Order Number (e.g. `AZ-1024`)

### Operational Workflow
1. **Customer Placement**:
   - Customer chooses **Company Bank Transfer** at checkout.
   - Order is recorded with status `pending`, `payment_status = 'awaiting_payment'`, `payment_provider = 'manual_bank'`.
   - Customer is shown the confirmation page with copy buttons for Barclays Bank UK Sort Code, Account Number, and Order Reference.
   - Clear notice: *"Your order has been received and is awaiting payment. Please transfer £X.XX to the bank details above using your order number as reference. Your order will be processed once payment is confirmed."*
2. **Customer Transfer**:
   - Customer opens their mobile banking app (Barclays, HSBC, Lloyds, Monzo, etc.) and transfers the exact total with their order number as reference.
3. **Admin Verification & Confirmation**:
   - Store administrator checks the Barclays Business account for the incoming transfer.
   - Admin opens **Admin Portal** -> **Orders**.
   - Awaiting bank transfer orders are prominently badged with `AWAITING BANK PAYMENT`.
   - Admin clicks **Confirm Payment** (either in the row or order details modal).
   - Admin confirms the dialog (optionally inputting statement note or transaction ref).
   - Order is instantly updated to:
     - `payment_status = 'paid'`
     - `status = 'processing'`
     - `paid_at = NOW()`
     - `payment_confirmed_by = admin_id`
   - Order can now proceed to dispatch and Royal Mail tracking entry.

---

## 5. Security & Compliance Safeguards

1. **No Raw Card Storage**: No raw card numbers, CVVs, or cardholder credentials touch or pass through the server. All card entry is isolated inside Stripe Hosted Checkout.
2. **Server Price Authority**: Order totals are recomputed on the backend from active database prices. Client tampering of prices in local storage or network payloads is blocked.
3. **Idempotency**: Webhook handlers check current order state before applying transitions to prevent duplicate charges or duplicate stock decrements.
4. **Zero Client Trust**: Frontend cannot mark an order as `paid`. Only verified server-side callbacks or authenticated admin RPC calls can set `payment_status = 'paid'`.
