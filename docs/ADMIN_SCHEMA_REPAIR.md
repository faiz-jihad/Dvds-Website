# Admin page blocked by an unrelated schema update

The previous admin layout checked every table, payment column and admin RPC
before rendering any page. A missing payment migration therefore blocked
**Users & Access**, even when the `profiles` table was ready.

The layout now checks only the current page's dependencies. Checks use read-only
queries and never invoke role changes, deletion, stock adjustments or payment
confirmation. Errors identify the exact missing table or column. Permission and
network failures are reported separately. A paused realtime connection does not
mean the database is offline.

## Repair the connected database

The connected project was checked without modifying data. `profiles` and the
operational tables exist, but `orders.payment_method`,
`store_settings.bank_account_number`, the newer checkout fields and
`payment_events` are absent.

1. Open the connected project in the Supabase Dashboard, then **SQL Editor**.
2. Run the complete contents of [repair_admin_schema.sql](../supabase/repair_admin_schema.sql).
3. Return to the affected admin page and select **Recheck database**.

The same SQL is available from **Download repair SQL** in the admin error panel.
It applies the payment upgrade, admin reliability functions and checkout sync
inside one transaction. It does not replay catalogue imports, create admin
accounts, delete business records, or change passwords. It preserves configured
bank accounts while clearing the old sample receiving account. Bank transfer
starts disabled when its setting is first created.

This repair expects the base operational schema. Its preflight stops before
changes if those prerequisites are missing. It is tested both on the older
pre-payment schema and when run twice on an already upgraded database.

For a project managed by Supabase CLI migrations, deploy pending migrations in
order instead. SQL Editor execution does not update the CLI migration ledger.

## Maintenance and verification

Regenerate the repair file after changing its source migrations:

```sh
node scripts/build-admin-repair.mjs
npm test
npm run build
```

The regression tests cover page-specific checks, an accessible Users page with
missing payment schema, precise errors and the download on the affected Orders
page, permission failures, and data-preserving SQL upgrades/retries.

The local environment has no administrative database connection or Supabase
management token. Generating this file does not apply it to the hosted database.
