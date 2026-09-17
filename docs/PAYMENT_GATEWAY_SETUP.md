# Checkout and admin payment setup

## Deployment requirements

Apply every pending SQL file in `supabase/migrations` in filename order, including `20260915000001_admin_reliability.sql` and `20260915000002_checkout_sync.sql`. Deploy the frontend and `/api` handlers together. The Vite development server loads these same handlers; it does not simulate payments.

Configure these variables on the server (see `.env.example`):

| Feature | Required server configuration |
| --- | --- |
| All checkout methods | `SUPABASE_URL` (or `VITE_SUPABASE_URL`), `SUPABASE_SERVICE_ROLE_KEY` |
| Provider redirects | `SITE_URL`, the canonical HTTPS storefront origin |
| Card | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| PayPal | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_ENVIRONMENT=sandbox` or `live` |

The browser uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never prefix service-role keys or payment secrets with `VITE_`. Hosted Stripe Checkout does not require Stripe.js or a publishable key in the payment page.

## Visa and Apple Pay

Card checkout is hosted by Stripe, so raw card numbers and CVVs never enter this application. Stripe supports Visa debit and credit cards through the enabled `card` payment method. Apple Pay is also handled by Stripe Checkout: it is shown only to eligible customers on a supported Apple device/browser and is not displayed as a selectable method elsewhere in the storefront. In Stripe Dashboard, enable Apple Pay and register the canonical HTTPS `SITE_URL` under **Payment method domains** before accepting live payments.

The existing `supabase/functions/*` Stripe implementation is legacy. This storefront uses `/api/*` exclusively. Do not deploy or configure the old Edge Function checkout/webhook alongside the new handlers. Remove old webhook destinations when switching deployments after any old in-flight payments have settled.

## Admin settings

Open **Admin > Store Settings > Payment methods & bank account**. Enable the desired methods and save. Online methods appear as available only when their required server configuration exists. A configured key is not a proof of provider connectivity: perform sandbox checks before enabling live traffic.

Bank transfer starts disabled. Enter and verify the receiving company account, then enable it. The migration clears only the old template sort code/account combination. It preserves other configured accounts. Every new bank order stores a snapshot of its bank details so later setting changes do not silently change instructions already issued to customers.

Delivery service names, estimates, standard fees, express fees, and free-delivery thresholds come from **Store Settings > Logistics**. A standard threshold of zero means free standard delivery. Express delivery uses its configured fee, including zero. Promotional discounts apply to merchandise; they do not discount delivery.

## Order lifecycle

1. `/api/checkout-quote` validates active database products, available quantities, current deal/promotion dates, delivery settings, and computes integer-pence totals.
2. The browser sends product IDs, quantities, delivery/address details, a request UUID, a random guest-access token, and the displayed total. The server recalculates the total and rejects a changed price before charging.
3. `create_checkout_order` creates one order, its actual line items, status history and stock reservation atomically. Repeating the request UUID returns the same order. Prices and stock are rechecked while the products are locked.
4. Card and PayPal orders start `pending`. Bank orders start `awaiting_payment`. A redirect or locally saved receipt never marks an order paid.
5. A verified provider payment or an administrator's bank confirmation changes the same database order to `paid` / `processing`. Payment reference and received time are saved. Retried events do not duplicate stock changes or reset dispatch status.
6. Admin order changes invalidate customer status queries. Bank/paid orders also poll every 15 seconds; pending online payments poll every 5 seconds. Guest customers use the protected status API; account owners can also access their own orders.
7. Failed provider requests preserve the original checkout attempt. The customer can retry it or cancel a saved unpaid order. Stripe cancellation expires its provider session first. Cancellation/expiry releases inventory once.
8. If a payment arrives after cancellation, it is recorded as paid with `payment_review_required`; dispatch is blocked until the exception is resolved. Refund through the corresponding provider dashboard when the order cannot be fulfilled.

Checkout guest-access tokens are stored in `sessionStorage`, with only their hashes saved in the database. Guest receipts must be opened in the browser session used for checkout. Signed-in customers can open their own orders from their account. There is no email-delivery implementation in this flow, so the UI does not claim an email was sent.

Bank transfers and abandoned PayPal orders have no automatic expiry timer. Administrators can cancel unpaid orders with a reason to release reserved stock. Refunds do not automatically restock physically shipped goods; use the inventory adjustment workflow after checking returned stock.

## Stripe webhook

Point a Stripe endpoint to `https://YOUR-SITE/api/stripe-webhook` and set its signing secret as `STRIPE_WEBHOOK_SECRET`. Subscribe to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.expired`
- `charge.refunded`

The handler verifies the signature against the raw body. Both checkout session metadata and PaymentIntent metadata contain the local order ID. Return verification checks session ownership, amount and currency. Refunds check the stored payment reference and use the cumulative refunded amount, so duplicate/out-of-order notifications do not subtract money twice.

See [Stripe Checkout fulfilment](https://docs.stripe.com/checkout/fulfillment) and [Stripe webhook signatures](https://docs.stripe.com/webhooks?lang=node).

## PayPal webhook

Create a webhook for the same PayPal application and environment as its credentials, with URL `https://YOUR-SITE/api/paypal-webhook`. Save its ID as `PAYPAL_WEBHOOK_ID`. Subscribe to:

- `CHECKOUT.ORDER.APPROVED`
- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.CAPTURE.REFUNDED`

The handler verifies PayPal's transmission headers through the signature verification API before writing to the database. Approved orders can be captured from the webhook even if the browser never returns. Creation and capture use request IDs for retry safety. Capture amount/currency/order linkage must match the local order. Refund resource IDs deduplicate incremental refunds.

See [PayPal webhook verification](https://developer.paypal.com/api/webhooks/v1/verify-webhook-signature-post/) and [PayPal request idempotency](https://developer.paypal.com/reference/guidelines/idempotency/).

## Admin operations

- **Bank payment:** Match the exact order reference and received amount against the receiving account, then use **Orders > Confirm payment**. Only administrators can confirm; staff cannot. Confirmation is atomic and audited.
- **Dispatch:** Requires a paid processing order, carrier and tracking number. Those details appear on the customer's order page.
- **Refund:** Perform the refund in Stripe/PayPal. Verified refund notifications update `refunded_amount`, payment status, order status for full refunds, and admin revenue. Revenue is payment-date sales net of recorded refunds; it is not a settlement-date cash-flow report.
- **Receipt:** Shows order totals, the current payment status, delivery and any refund. It does not fabricate VAT details, company registration data or internal admin notes.

## Verification

Run `npm test` and `npm run build`. Tests cover quote rounding, delivery, promotions, guest authorization, safe retries, payment state rendering, RLS, atomic stock reservation, bank confirmation, webhook prerequisites, provider matching, late payment handling and refund deduplication.

Before live use, also check with provider sandbox accounts and a migrated Supabase project:

1. Standard and express delivery totals agree between checkout, provider and admin.
2. Complete one card payment and one PayPal payment; verify the same order/line items in admin.
3. Repeat callbacks and refresh the return page; no duplicate orders or stock decrements.
4. Cancel a pending checkout; stock is released. A late paid notification must require admin review.
5. Create a bank order, confirm actual test receipt in admin, and observe customer status changing.
6. Dispatch with tracking and observe customer status. Test partial/full provider refunds.
7. Confirm disabled methods cannot be selected or invoked directly, and a guest cannot access another order.

Local unit/database tests do not prove live gateway configuration, bank ownership, webhook delivery or production browser rendering.
