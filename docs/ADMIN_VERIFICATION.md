# Admin Feature Verification — September 2026

## Overview & Results

Codebase integrity has been verified using end-to-end API tests, React component rendering tests, and an isolated local PostgreSQL instance (PGlite). Database test suites apply all migrations, verifying transactions, storage, role-based access controls, and audit logging without modifying live production data.

Verification status: **95 tests passing, 0 failing**; TypeScript compilation and Vite production build succeeded.

**Live database schema checklist**: Verify that all columns including `orders.payment_method`, `store_settings.registered_company_name`, `payment_events`, and `media_assets` are present. Profiles, products, categories, genres, promotions, support enquiries, and audit log tables must have valid RLS policies and RPC functions enabled.

Live payment provider integration should follow [PAYMENT_GATEWAY_SETUP.md](PAYMENT_GATEWAY_SETUP.md).

## Admin Console Feature Coverage

| Feature / Menu | Verification Details & Local Evidence |
| --- | --- |
| **Dashboard** | Revenue calculations reflect settled payments net of refunds. Unconfigured store settings prompt initial setup. Live updates re-calculate KPI summaries. |
| **Homepage Builder** | Draft, publish, and revert workflows persist to database. All 8 published section types render in scheduled sequence. Pre-existing store defaults remain intact until first publication. |
| **Products** | Products and genres save within a single atomic database transaction. Invalid genres abort the transaction, protecting inventory and audit logs. Metadata updates preserve stock quantities. |
| **Categories** | Full CRUD for categories and genres connects directly to Supabase. Deleted categories or genres are evicted immediately from the storefront cache. |
| **Inventory** | Stock adjustments utilise atomic RPC procedures with audit ledger reasons. Fractional or negative adjustments are rejected. Low-stock thresholds trigger automated warnings. |
| **Orders** | Stripe/PayPal capture, bank transfer confirmation, Royal Mail dispatch tracking, stock reservation release, and refund idempotency are validated. Customers only access their own orders. |
| **Promotions** | Promo coupon creation, scheduled activation, and checkout discount validation run server-side. Updating a promotion immediately recalculates active checkout quotes. |
| **Customer Support** | Enquiry status, assigned staff, and internal notes persist reliably. Status updates trigger admin audit log entries. |
| **Users & Access** | Role assignment and account deactivation are restricted to administrators. Staff members cannot escalate permissions. Admins cannot demote or delete their own active account. |
| **Store Settings** | Singleton configuration persists with verified database UUID. Payment provider keys and Royal Mail delivery rules update via secure server settings. |
| **Audit Log** | Automatically logs actions across products, genres, inventory, orders, settings, roles, homepage sections, and media assets. Invalidation maintains real-time dashboard accuracy. |

The Media Library maintains shared metadata in `media_assets`, restricted to admin and staff roles. Image files reside securely within the `products` storage bucket.

## Live Activation Steps

1. Open the **SQL Editor** in your Supabase project dashboard.
2. Execute the contents of [repair_admin_schema.sql](../supabase/repair_admin_schema.sql) in a single transaction. (Also downloadable via **Download repair SQL** in the admin console if schema issues are detected).
3. Click **Recheck database**. Run `node src/scripts/testDb.js` to inspect columns and table accessibility across all sections. The verification script executes non-destructive read requests (`limit=0`).
4. Log in as an administrator to verify the test flows outlined above. Ensure staff accounts operate within their defined permission boundaries.

The repair script safely injects missing company identity and audit columns without overwriting existing configuration or catalog data.

## Verification Commands

```sh
npm test
npm run build
node src/scripts/testDb.js
```

Always verify final production behaviour in your staging or live environment after applying database migrations and provider credentials.
