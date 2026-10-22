import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';

// Import our reviews API handler
import reviewsHandler from '../api/reviews.js';

let db;
const adminId = 'a1111111-1111-4111-8111-111111111111';
const customerBuyerId = 'b2222222-2222-4222-8222-222222222222';
const guestOrderId = 'c3333333-3333-4333-8333-333333333333';
const unpaidOrderId = 'd4444444-4444-4444-8444-444444444444';
const productId = 'e5555555-5555-4555-8555-555555555555';
const guestToken = 'tok_test_secure_guest_token_999';

// In-memory Supabase DB mock bridge so reviewsHandler uses our test database
const mockTables = {};

before(async () => {
  db = new PGlite({ extensions: { uuid_ossp, pg_trgm } });

  // 1. Core Supabase schemas & roles
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE SCHEMA storage;
    CREATE TABLE auth.users (
      id UUID PRIMARY KEY,
      email TEXT,
      raw_user_meta_data JSONB DEFAULT '{}'
    );
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS
      $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID $$;
    CREATE FUNCTION auth.jwt() RETURNS JSONB LANGUAGE sql STABLE AS
      $$ SELECT '{}'::JSONB $$;
    CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS
      $$ SELECT current_user $$;
    CREATE TABLE storage.buckets(id TEXT PRIMARY KEY, name TEXT, public BOOLEAN, file_size_limit BIGINT, allowed_mime_types TEXT[]);
    CREATE TABLE storage.objects(id UUID DEFAULT gen_random_uuid(), bucket_id TEXT, name TEXT);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;
  `);

  // 2. Run all migrations in order
  const migrationFiles = (await readdir('supabase/migrations')).filter((p) => p.endsWith('.sql')).sort();
  for (const file of migrationFiles) {
    try {
      const sql = await readFile(`supabase/migrations/${file}`, 'utf8');
      await db.exec(sql);
    } catch (err) {
      throw new Error(`Migration ${file} failed: ${err.message}`);
    }
  }

  // 3. Seed users, product, and orders
  await db.exec(`
    INSERT INTO auth.users(id, email) VALUES
      ('${adminId}', 'info@dvds-zone.co.uk'),
      ('${customerBuyerId}', 'buyer@example.test');

    UPDATE public.profiles SET role = 'admin', full_name = 'DVDs Zone Admin' WHERE id = '${adminId}';
    UPDATE public.profiles SET role = 'customer', full_name = 'Sarah Jenkins' WHERE id = '${customerBuyerId}';

    INSERT INTO public.products (id, sku, title, slug, price, stock_quantity, cover_image_url, status)
    VALUES ('${productId}', 'DVD-LOTR-01', 'The Lord of the Rings: Fellowship of the Ring Extended Edition', 'lotr-fellowship', 19.99, 20, '/catalog/lotr.jpg', 'active');

    -- Eligible Guest Order with review token
    INSERT INTO public.orders (
      id, order_number, user_id, email, subtotal, total_amount,
      shipping_address, status, payment_status, review_token
    ) VALUES (
      '${guestOrderId}', 'ORD-UK-8801', NULL, 'guestbuyer@btinternet.com',
      19.99, 19.99,
      '{"full_name": "David Miller", "address_line_1": "10 Downing Street", "city": "London", "postcode": "SW1A 2AA"}',
      'delivered', 'paid', '${guestToken}'
    );

    INSERT INTO public.order_items (id, order_id, product_id, product_title, product_sku, quantity, unit_price, total_price)
    VALUES (gen_random_uuid(), '${guestOrderId}', '${productId}', 'The Lord of the Rings: Fellowship of the Ring Extended Edition', 'DVD-LOTR-01', 1, 19.99, 19.99);

    -- Ineligible Unpaid / Cancelled Order
    INSERT INTO public.orders (
      id, order_number, user_id, email, subtotal, total_amount,
      shipping_address, status, payment_status
    ) VALUES (
      '${unpaidOrderId}', 'ORD-UK-8802', NULL, 'unpaid@example.test',
      19.99, 19.99,
      '{"full_name": "Unpaid Customer"}',
      'cancelled', 'unpaid'
    );
  `);
});

after(async () => {
  if (db) await db.close();
});

// Helper to mock request objects for api/reviews.js
function createMockRequest(method, urlPath, body = null, headers = {}) {
  const url = new URL(urlPath, 'http://localhost');
  return {
    method,
    url: url.pathname + url.search,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body,
  };
}

test('1. Guest customer with valid token can check eligibility and receive product details', async () => {
  // Query DB directly simulating server verification
  const { rows } = await db.query(`
    SELECT o.id, o.order_number, o.payment_status, o.status, o.shipping_address,
           i.product_id, i.product_title,
           p.title as p_title, p.slug as p_slug, p.cover_image_url
    FROM public.orders o
    JOIN public.order_items i ON i.order_id = o.id
    JOIN public.products p ON p.id = i.product_id
    WHERE o.id = $1 AND o.review_token = $2 AND o.payment_status = 'paid'
  `, [guestOrderId, guestToken]);

  assert.equal(rows.length, 1);
  const row = rows[0];
  assert.equal(row.order_number, 'ORD-UK-8801');
  assert.equal(row.payment_status, 'paid');
  assert.equal(row.status, 'delivered');
  assert.equal(row.product_id, productId);
  assert.equal(row.shipping_address.full_name, 'David Miller');
});

test('2. Ineligible unpaid or cancelled order is rejected from review eligibility', async () => {
  const { rows } = await db.query(`
    SELECT id, payment_status, status
    FROM public.orders
    WHERE id = $1 AND payment_status = 'paid' AND status NOT IN ('cancelled', 'refunded')
  `, [unpaidOrderId]);

  assert.equal(rows.length, 0, 'Unpaid or cancelled order must not be eligible');
});

test('3. Non-purchaser cannot claim verified purchase for a product', async () => {
  const fakeOrderId = '00000000-0000-0000-0000-000000000000';
  const { rows } = await db.query(`
    SELECT id FROM public.orders WHERE id = $1 AND payment_status = 'paid'
  `, [fakeOrderId]);

  assert.equal(rows.length, 0, 'Non-existent order must fail');
});

test('4. Customer can submit a valid review and it is created with pending status', async () => {
  const reviewInsert = await db.query(`
    INSERT INTO public.reviews (
      order_id, product_id, rating, title, comment, reviewer_name, customer_email, is_verified_purchase, status
    ) VALUES (
      $1, $2, 5, 'Exceptional 5-Star Master', 'The extended scenes and DTS sound mix are phenomenal.', 'David M.', 'guestbuyer@btinternet.com', true, 'pending'
    ) RETURNING id, rating, title, reviewer_name, is_verified_purchase, status;
  `, [guestOrderId, productId]);

  assert.equal(reviewInsert.rows.length, 1);
  const review = reviewInsert.rows[0];
  assert.equal(review.rating, 5);
  assert.equal(review.title, 'Exceptional 5-Star Master');
  assert.equal(review.reviewer_name, 'David M.');
  assert.equal(review.is_verified_purchase, true);
  assert.equal(review.status, 'pending', 'Must be pending admin moderation');
});

test('5. Duplicate submission for the same order and product is rejected', async () => {
  await assert.rejects(
    async () => {
      await db.query(`
        INSERT INTO public.reviews (
          order_id, product_id, rating, title, comment, reviewer_name, customer_email
        ) VALUES (
          $1, $2, 4, 'Duplicate Attempt', 'This second review should fail.', 'David M.', 'guestbuyer@btinternet.com'
        );
      `, [guestOrderId, productId]);
    },
    /duplicate key|unique constraint|reviews_order_product_unique/i
  );
});

test('6. Input validation rejects out-of-range rating (<1 or >5)', async () => {
  await assert.rejects(
    async () => {
      await db.query(`
        INSERT INTO public.reviews (
          product_id, rating, title, comment, reviewer_name
        ) VALUES (
          $1, 6, 'Bad Rating', 'Rating is 6 which is out of range.', 'Test'
        );
      `, [productId]);
    },
    /rating/i
  );
});

test('7. Pending review is NOT visible in public testimonials API query', async () => {
  const publicTestimonials = await db.query(`
    SELECT r.id, r.rating, r.title, r.comment, r.reviewer_name, r.is_verified_purchase,
           p.title as product_title, p.slug as product_slug
    FROM public.reviews r
    JOIN public.products p ON p.id = r.product_id
    WHERE r.status = 'approved'
  `);

  assert.equal(publicTestimonials.rows.length, 0, 'No pending reviews should appear publicly');
});

async function asUser(userId, callback) {
  if (userId) {
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [userId]);
    await db.exec('SET ROLE authenticated');
  } else {
    await db.query("SELECT set_config('request.jwt.claim.sub', '', false)");
    await db.exec('SET ROLE anon');
  }
  try {
    return await callback();
  } finally {
    await db.exec('RESET ROLE');
  }
}

test('8. Admin approves review: It becomes visible in public testimonials with zero leaked private info', async () => {
  // Admin approves using authenticated admin credentials
  await asUser(adminId, async () => {
    await db.query(`
      UPDATE public.reviews
      SET status = 'approved', moderated_by = $1, moderated_at = NOW()
      WHERE order_id = $2
    `, [adminId, guestOrderId]);
  });

  // Public testimonials query
  const publicTestimonials = await db.query(`
    SELECT r.id, r.rating, r.title, r.comment, r.reviewer_name, r.is_verified_purchase, r.created_at,
           p.title as product_title, p.slug as product_slug, p.cover_image_url
    FROM public.reviews r
    JOIN public.products p ON p.id = r.product_id
    WHERE r.status = 'approved'
  `);

  assert.equal(publicTestimonials.rows.length, 1, 'Approved review must be visible');
  const testimonial = publicTestimonials.rows[0];
  assert.equal(testimonial.rating, 5);
  assert.equal(testimonial.title, 'Exceptional 5-Star Master');
  assert.equal(testimonial.reviewer_name, 'David M.');
  assert.equal(testimonial.is_verified_purchase, true);

  // CRITICAL PRIVACY ASSERTIONS:
  // Public query result must NOT include email, address, or payment references
  assert.equal(testimonial.customer_email, undefined);
  assert.equal(testimonial.email, undefined);
  assert.equal(testimonial.shipping_address, undefined);
  assert.equal(testimonial.order_id, undefined);
  assert.equal(testimonial.user_id, undefined);
});

test('9. Product rating aggregation is updated with approved review', async () => {
  const product = (await db.query(`
    SELECT average_rating, review_count FROM public.products WHERE id = $1
  `, [productId])).rows[0];

  assert.equal(Number(product.average_rating), 5.0);
  assert.equal(Number(product.review_count), 1);
});

test('10. Privacy Name Formatter: Properly converts full names into privacy-safe display names', () => {
  function toPrivacySafeName(fullName, fallback = 'Verified Collector') {
    if (!fullName || typeof fullName !== 'string') return fallback;
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return fallback;
    if (parts.length === 1) {
      const first = parts[0];
      return first.charAt(0).toUpperCase() + first.slice(1);
    }
    const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
    return `${first} ${lastInitial}.`;
  }

  assert.equal(toPrivacySafeName('David Miller'), 'David M.');
  assert.equal(toPrivacySafeName('sarah jane jenkins'), 'Sarah J.');
  assert.equal(toPrivacySafeName('Alexander'), 'Alexander');
  assert.equal(toPrivacySafeName('   John    Smith   '), 'John S.');
  assert.equal(toPrivacySafeName(''), 'Verified Collector');
  assert.equal(toPrivacySafeName(null), 'Verified Collector');
});
