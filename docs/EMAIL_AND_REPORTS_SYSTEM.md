# DVDs Zone — Email & Business Reporting Architecture

The DVDs Zone email and business reporting architecture maintains strict separation of concerns across two distinct domains:

1. **CUSTOMER**: Official payment receipts and dispatch confirmations, automatically dispatched once payment is cryptographically verified by the Stripe or PayPal webhook.
2. **ADMIN**: Executive business performance reports (scheduled weekly and monthly), aggregating sales metrics, top-selling titles, operational expenditure, and net earnings.

Both subsystems operate independently and remain completely isolated.

---

## 1. Architecture & Workflows

### A. Customer Payment Receipt Flow

```text
Customer Completes Payment (Stripe / PayPal / Gateway)
                        │
                        ▼
Payment Gateway Sends Webhook to /api/stripe-webhook
                        │
                        ▼
Verify Cryptographic Webhook Signature (e.g. stripe.webhooks.constructEvent)
                        │
                        ▼
Idempotency Verification (payment_events & email_logs)
                        │
                        ▼
Confirm Order Status in Database (payment_status = 'paid')
                        │
                        ▼
Retrieve Verified Items from Database (orders + order_items)
                        │
                        ▼
Dispatch Official Email Receipt via Resend / SendGrid
                        │
                        ▼
Record orders.receipt_sent_at = NOW() & Log to email_logs
```

#### Customer Receipt Business Rules:
- **Dispatched Exclusively After Webhook Verification**: Receipts are never triggered simply because a customer lands on the frontend `/order-success` page.
- **Cardholder Data Privacy**: Never includes full primary account numbers (PAN), CVVs, or secret API credentials.
- **Brand Identity**: Features official DVDs Zone branding, mobile-responsive layout, and structured itemisation.
- **Action Links**: Includes a secure "View Order" link guiding customers directly to their order status and tracking details.
- **Idempotency Protection**: Ensures duplicate receipts are never sent when webhook retries occur.

---

### B. Admin Business Reporting Flow

Store administrators receive periodic aggregated executive summaries without being spammed per individual transaction.

```text
Vercel Cron Trigger (0 8 * * * UTC) ──► GET /api/cron-reports
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
         Monday Morning?                                             1st of the Month?
                 │                                                             │
                 ▼                                                             ▼
       Weekly Business Report                                        Monthly Business Report
 (Previous Mon 00:00 - Sun 23:59 UTC)                           (Previous full calendar month)
                 │                                                             │
                 └──────────────────────────────┬──────────────────────────────┘
                                                │
                                                ▼
                     Calculate Verified Metrics via Database:
                     - Net Settled Revenue (Paid orders only)
                     - Order Volume & Total Units Sold
                     - Average Order Value (AOV)
                     - Top-Selling Titles (By units & revenue)
                     - Categorised Expenditure (expenses table)
                     - Deductions for Full & Partial Refunds
                     - Estimated Profit vs Net Revenue After Expenses
                                                │
                                                ▼
                     Format Executive Email & Dispatch to ADMIN_EMAIL
                                                │
                                                ▼
                     Persist Snapshot to report_history (status: sent / failed)
```

---

## 2. Financial Calculations & Data Integrity

The reporting system never fabricates metrics, calculating directly from verified database records:

1. **Gross Revenue**:
   - Only counts orders with `payment_status = 'paid'`.
   - Excludes cancelled, pending, failed, or expired checkouts.
2. **Refund Deductions**:
   - Proportionately deducts `refunded_amount` values recorded in the database.
3. **Operational Expenses**:
   - Pulled directly from the `expenses` table for the specified period.
4. **Distinction Between "Estimated Profit" and "Net Revenue After Recorded Expenses"**:
   - If product cost prices (`products.cost_price` / COGS) are partially missing:
     $$\text{Net Revenue After Recorded Expenses} = \text{Revenue} - \text{Refunds} - \text{Recorded Expenses}$$
   - Only when all sold items contain a verified `cost_price` does the system label the metric as:
     $$\text{Estimated Profit} = \text{Revenue} - \text{COGS} - \text{Refunds} - \text{Recorded Expenses}$$

---

## 3. Expense Management Subsystem

Administrators manage store operating costs directly via the `/admin/reports` console:

- **Expense Categories**:
  - `shipping` (Courier and Royal Mail postage fees)
  - `packaging` (Boxes, bubble wrap, security tape)
  - `payment_fees` (Stripe and payment gateway interchange fees)
  - `inventory` (Physical media inventory acquisitions)
  - `marketing` (Advertising campaigns)
  - `website_domain` (Domain renewals & DNS)
  - `vps_hosting` (Hosting and infrastructure costs)
  - `other` (General operating sundries)
- **Stored Fields**: Description, Category, Amount (£), Date, and Optional Notes.

---

## 4. Environment Configuration & Providers

Set the following environment variables in your deployment environment (e.g. Vercel Project Settings):

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `ADMIN_EMAIL` | Destination email address for periodic reports | `admin@azrayan.co.uk` |
| `EMAIL_FROM` | Sender identity for receipts and reports | `DVD ZONE <orders@azrayan.co.uk>` |
| `RESEND_API_KEY` | *(Primary)* API key from [Resend](https://resend.com) | `re_123456789...` |
| `SENDGRID_API_KEY` | *(Alternative)* API key from [SendGrid](https://sendgrid.com) | `SG.xxxxxxxx...` |
| `CRON_SECRET` | Secret bearer token protecting the cron endpoint | `random-32-char-token` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_xxxxxxxx...` |

> **Development Simulation Mode**: When neither `RESEND_API_KEY` nor `SENDGRID_API_KEY` is supplied (such as in local development), the mailer falls back cleanly to simulation mode. Delivery payloads are logged to the console without interrupting payment completion.

---

## 5. Vercel Cron Schedule (`vercel.json`)

Automated report triggers are configured via Vercel Cron:

```json
{
  "crons": [
    {
      "path": "/api/cron-reports",
      "schedule": "0 8 * * *"
    }
  ]
}
```

- Endpoint is evaluated daily at 08:00 UTC.
- On Mondays, the cron processes the **Weekly Report** (previous Monday to Sunday).
- On the 1st of each month, the cron processes the **Monthly Report** (previous calendar month).

---

## 6. Report History & Failure Recovery

- Every generated report is persisted to `report_history` alongside its JSON metrics snapshot.
- If email transmission encounters an error (such as provider quota exhaustion), status is recorded as `status = 'failed'` with the exact error message preserved in `error_message`.
- Administrators can review the dispatch ledger in `/admin/reports` and trigger an immediate **"Resend"** for any failed report.
- The **"Trigger Report Now"** utility allows on-demand snapshot generation at any time without waiting for scheduled crons.

---

## 7. Associated Database Schema

Migration file: `supabase/migrations/20261007000001_business_reports_and_expenses.sql`

- **`expenses` table**: Tracks operating expenditures.
- **`report_history` table**: Maintains history of weekly and monthly reports.
- **`email_logs` table**: Audit log of all outgoing customer receipts and executive reports.
- **`orders.receipt_sent_at` column**: Timestamp confirming receipt dispatch.
- **`products.cost_price` column**: Product unit acquisition cost for accurate COGS calculations.
