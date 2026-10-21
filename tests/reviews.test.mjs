import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';

let db;
const adminId = '11111111-1111-4111-8111-111111111111';
const customerBuyer = '22222222-2222-4222-8222-222222222222';
const customerNonBuyer = '33333333-3333-4333-8333-333333333333';
const productId = '44444444-4444-4444-8444-444444444444';
const orderId = '55555555-5555-5555-8555-555555555555';

before(async () => {
  db = new PGlite({ extensions: { uuid_ossp, pg_trgm } });

  // 1. Supabase core mocks
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

  // 2. Run all existing migrations in order
  const migrationFiles = (await readdir('supabase/migrations')).filter((p) => p.endsWith('.sql')).sort();
  for (const file of migrationFiles) {
    try {
      const sql = await readFile(`supabase/migrations/${file}`, 'utf8');
      await db.exec(sql);
    } catch (err) {
      throw new Error(`Migration ${file} failed: ${err.message}`);
    }
  }

  // 3. Seed users, product, and paid order
  await db.exec(`
    INSERT INTO auth.users(id, email) VALUES
      ('${adminId}', 'admin@azrayan.co.uk'),
      ('${customerBuyer}', 'buyer@example.test'),
      ('${customerNonBuyer}', 'nonbuyer@example.test');

    UPDATE public.profiles SET role = 'admin', full_name = 'Admin User' WHERE id = '${adminId}';
    UPDATE public.profiles SET role = 'customer', full_name = 'Verified Buyer' WHERE id = '${customerBuyer}';
    UPDATE public.profiles SET role = 'customer', full_name = 'Regular Visitor' WHERE id = '${customerNonBuyer}';

    INSERT INTO public.products (id, sku, title, slug, price, stock_quantity, cover_image_url, status)
    VALUES ('${productId}', 'TEST-DVD-01', 'Blade Runner Collector Edition', 'blade-runner', 14.99, 10, '/covers/bladerunner.jpg', 'active');

    -- Create paid order for customerBuyer containing this product
    INSERT INTO public.orders (id, order_number, user_id, email, subtotal, total_amount, shipping_address, status, payment_status)
    VALUES ('${orderId}', 'ORD-BUYER-001', '${customerBuyer}', 'buyer@example.test', 14.99, 14.99, '{}', 'dispatched', 'paid');

    INSERT INTO public.order_items (id, order_id, product_id, product_title, product_sku, quantity, unit_price, total_price)
    VALUES (gen_random_uuid(), '${orderId}', '${productId}', 'Blade Runner Collector Edition', 'TEST-DVD-01', 1, 14.99, 14.99);
  `);
});

after(async () => {
  if (db) await db.close();
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

test('1. Verified Buyer: Purchase is automatically verified and review is created with pending status', async () => {
  const result = await asUser(customerBuyer, async () => {
    // Attempting to spoof is_verified_purchase = false or status = 'approved' should be overridden by database trigger
    return (await db.query(`
      INSERT INTO public.reviews (product_id, user_id, rating, title, comment, reviewer_name, status, is_verified_purchase)
      VALUES ($1, $2, 5, 'Masterpiece 4K Master', 'The video transfer on this DVD pressing is immaculate.', 'Verified Buyer', 'approved', false)
      RETURNING id, rating, title, status, is_verified_purchase, order_id;
    `, [productId, customerBuyer])).rows[0];
  });

  assert.equal(result.rating, 5);
  assert.equal(result.title, 'Masterpiece 4K Master');
  // Must be marked verified purchase automatically from actual paid order!
  assert.equal(result.is_verified_purchase, true, 'Review must be marked verified purchase');
  assert.equal(result.order_id, orderId, 'Review must reference the verified order');
  // Must be pending moderation — customer cannot self-approve!
  assert.equal(result.status, 'pending', 'Review status must be pending, not approved');
});

test('2. Non-Buyer: Review is created as unverified purchase (is_verified_purchase = false)', async () => {
  const result = await asUser(customerNonBuyer, async () => {
    // Attempting to spoof is_verified_purchase = true
    return (await db.query(`
      INSERT INTO public.reviews (product_id, user_id, rating, title, comment, reviewer_name, is_verified_purchase)
      VALUES ($1, $2, 4, 'Great Film Experience', 'Enjoyed the extras and commentary track.', 'Regular Visitor', true)
      RETURNING id, rating, status, is_verified_purchase, order_id;
    `, [productId, customerNonBuyer])).rows[0];
  });

  assert.equal(result.rating, 4);
  assert.equal(result.is_verified_purchase, false, 'Non-buyer must NOT be granted verified purchase status');
  assert.equal(result.order_id, null, 'Non-buyer order_id must be null');
  assert.equal(result.status, 'pending', 'Status must default to pending');
});

test('3. Duplicate Prevention: A user cannot submit multiple reviews for the same product', async () => {
  await assert.rejects(
    async () => {
      await asUser(customerBuyer, async () => {
        await db.query(`
          INSERT INTO public.reviews (product_id, user_id, rating, title, comment, reviewer_name)
          VALUES ($1, $2, 1, 'Duplicate Review', 'Trying to spam another review for the same item.', 'Verified Buyer');
        `, [productId, customerBuyer]);
      });
    },
    /reviews_user_product_unique|duplicate key/
  );
});

test('4. Input Validation: Invalid ratings (<1 or >5) or empty text are rejected by database constraints', async () => {
  const otherProduct = '66666666-6666-6666-8666-666666666666';
  await db.query(`
    INSERT INTO public.products (id, sku, title, slug, price, stock_quantity, cover_image_url)
    VALUES ($1, 'TEST-02', 'Dune Part 2', 'dune-2', 19.99, 5, '/test.jpg');
  `, [otherProduct]);

  // Rating 6 (out of bounds)
  await assert.rejects(
    async () => {
      await asUser(customerBuyer, async () => {
        await db.query(`
          INSERT INTO public.reviews (product_id, user_id, rating, title, comment, reviewer_name)
          VALUES ($1, $2, 6, 'Too High', 'This rating should fail.', 'User');
        `, [otherProduct, customerBuyer]);
      });
    },
    /rating/
  );

  // Short comment (under 5 characters)
  await assert.rejects(
    async () => {
      await asUser(customerBuyer, async () => {
        await db.query(`
          INSERT INTO public.reviews (product_id, user_id, rating, title, comment, reviewer_name)
          VALUES ($1, $2, 5, 'Too Short', 'Bad', 'User');
        `, [otherProduct, customerBuyer]);
      });
    },
    /comment/
  );
});

test('5. Row Level Security: Public and anonymous visitors cannot see pending or rejected reviews', async () => {
  const publicReviews = await asUser(null, async () => {
    return (await db.query(`SELECT * FROM public.reviews WHERE product_id = $1`, [productId])).rows;
  });

  // Since both reviews in productId are currently pending, public query returns 0 rows!
  assert.equal(publicReviews.length, 0, 'Public visitors cannot see pending reviews');

  // Customer can see their own review
  const ownReviews = await asUser(customerBuyer, async () => {
    return (await db.query(`SELECT * FROM public.reviews WHERE product_id = $1`, [productId])).rows;
  });
  assert.equal(ownReviews.length, 1, 'Customer can see their own pending review');
});

test('6. Admin Moderation: Staff/Admin can view all reviews and approve or reject them', async () => {
  // Admin queries all reviews
  const allReviews = await asUser(adminId, async () => {
    return (await db.query(`SELECT id, status, reviewer_name FROM public.reviews WHERE product_id = $1 ORDER BY created_at ASC`, [productId])).rows;
  });
  assert.equal(allReviews.length, 2, 'Admin can view all pending reviews');

  const buyerReviewId = allReviews[0].id;
  const nonBuyerReviewId = allReviews[1].id;

  // Admin approves the buyer review
  await asUser(adminId, async () => {
    await db.query(`
      UPDATE public.reviews
      SET status = 'approved', moderation_note = 'High quality verified review'
      WHERE id = $1
    `, [buyerReviewId]);
  });

  // Admin rejects the second review
  await asUser(adminId, async () => {
    await db.query(`
      UPDATE public.reviews
      SET status = 'rejected', moderation_note = 'Spam content'
      WHERE id = $1
    `, [nonBuyerReviewId]);
  });

  // Verify updated statuses
  const updatedReviews = (await db.query(`SELECT id, status, moderated_by, moderation_note FROM public.reviews WHERE product_id = $1 ORDER BY created_at ASC`, [productId])).rows;
  assert.equal(updatedReviews[0].status, 'approved');
  assert.equal(updatedReviews[0].moderated_by, adminId);
  assert.equal(updatedReviews[1].status, 'rejected');

  // Now public can see only the 1 approved review!
  const publicVisible = await asUser(null, async () => {
    return (await db.query(`SELECT id, title, rating, is_verified_purchase FROM public.reviews WHERE product_id = $1`, [productId])).rows;
  });
  assert.equal(publicVisible.length, 1, 'Public should see exactly 1 approved review');
  assert.equal(publicVisible[0].is_verified_purchase, true, 'Public review has verified purchase badge');
});

test('7. Rating Calculations: Product average_rating and review_count are automatically updated from approved reviews', async () => {
  const productRow = (await db.query(`SELECT average_rating, review_count FROM public.products WHERE id = $1`, [productId])).rows[0];

  assert.equal(Number(productRow.average_rating), 5.0, 'Average rating must be 5.0 from the single 5-star approved review');
  assert.equal(Number(productRow.review_count), 1, 'Review count must be 1 (only approved reviews count)');

  // Test review summary RPC
  const summary = (await db.query(`SELECT public.get_product_review_summary($1) as summary`, [productId])).rows[0].summary;
  assert.equal(summary.total_reviews, 1);
  assert.equal(summary.average_rating, 5);
  assert.equal(summary.five_star, 1);
  assert.equal(summary.verified_count, 1);
});

test('8. Check User Review Eligibility RPC: Correctly reports status for authenticated buyer vs non-buyer', async () => {
  const buyerCheck = await asUser(customerBuyer, async () => {
    return (await db.query(`SELECT public.check_user_review_eligibility($1) as res`, [productId])).rows[0].res;
  });

  assert.equal(buyerCheck.authenticated, true);
  assert.equal(buyerCheck.has_reviewed, true);
  assert.equal(buyerCheck.can_review, false);
  assert.equal(buyerCheck.is_verified_purchase, true);

  // For unauthenticated visitor
  const anonCheck = await asUser(null, async () => {
    return (await db.query(`SELECT public.check_user_review_eligibility($1) as res`, [productId])).rows[0].res;
  });
  assert.equal(anonCheck.authenticated, false);
  assert.equal(anonCheck.can_review, false);
});
