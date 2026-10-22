import { dbClient, endpoint, requestUser, CheckoutError } from './_checkout.js';
import { checkRateLimit, getClientIp, sanitizeInputObject } from './_rate-limit.js';

const MASTER_ADMIN_EMAILS = new Set([
  'info@dvds-zone.co.uk',
  'azrayanltd@gmail.com',
  'admin@dvds-zone.co.uk',
  'admin@dvdszone.co.uk',
  'admin@azrayan.co.uk',
  'faizalba74@gmail.com',
]);

/**
 * Format a privacy-safe display name:
 * e.g. "Sarah Jenkins" -> "Sarah J." or "David" -> "David"
 * Never returns emails, full addresses, or sensitive identities.
 */
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

export default endpoint(async (req) => {
  const db = dbClient();
  const method = req.method || 'GET';
  const clientIp = getClientIp(req);

  // ───────────────────────────────────────────────────────────────────────────
  // 1. GET Requests: Testimonials, Product Reviews, or Eligibility Check
  // ───────────────────────────────────────────────────────────────────────────
  if (method === 'GET') {
    const url = new URL(req.url, 'http://localhost');
    const testimonials = url.searchParams.get('testimonials') === 'true';
    const checkEligibility = url.searchParams.get('check_eligibility') === 'true';
    const productId = url.searchParams.get('product_id');
    const orderId = url.searchParams.get('order_id');
    const token = url.searchParams.get('token');

    // 1A. Eligibility Check (for Review Submission Page)
    if (checkEligibility) {
      if (!orderId && !productId) {
        throw new CheckoutError('Order ID or Product ID required to check eligibility.', 400);
      }

      let order = null;
      let user = null;

      try {
        user = await requestUser(db, req);
      } catch {}

      // If token provided, verify directly with order
      if (orderId && token) {
        const { data: ord } = await db
          .from('orders')
          .select('id, order_number, email, payment_status, status, shipping_address, order_items(id, product_id, product_title, quantity)')
          .eq('id', orderId)
          .eq('review_token', token)
          .maybeSingle();

        if (ord) order = ord;
      }

      // If authenticated user and orderId provided, verify ownership
      if (!order && orderId && user) {
        const { data: ord } = await db
          .from('orders')
          .select('id, order_number, email, payment_status, status, shipping_address, order_items(id, product_id, product_title, quantity)')
          .eq('id', orderId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (ord) order = ord;
      }

      // If user provided no orderId but is authenticated with a productId
      if (!order && user && productId) {
        const { data: ord } = await db
          .from('orders')
          .select('id, order_number, email, payment_status, status, shipping_address, order_items(id, product_id, product_title, quantity)')
          .eq('user_id', user.id)
          .eq('payment_status', 'paid')
          .not('status', 'in', '("cancelled","refunded")')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (ord) order = ord;
      }

      if (!order) {
        return {
          eligible: false,
          reason: 'No eligible verified order found. Orders must be paid and completed to leave a verified review.',
        };
      }

      // Must be paid and completed
      if (order.payment_status !== 'paid' || ['cancelled', 'refunded'].includes(order.status)) {
        return {
          eligible: false,
          reason: 'This order is not eligible for review (payment not completed or order was cancelled).',
        };
      }

      // Match product in order items
      const items = Array.isArray(order.order_items) ? order.order_items : [];
      let targetItem = null;
      if (productId) {
        targetItem = items.find((i) => i.product_id === productId);
      } else if (items.length > 0) {
        targetItem = items[0];
      }

      if (!targetItem) {
        return {
          eligible: false,
          reason: 'The specified product was not found in this order.',
        };
      }

      // Check if review already exists for this order & product
      const { data: existingReview } = await db
        .from('reviews')
        .select('id, rating, title, status, created_at')
        .eq('product_id', targetItem.product_id)
        .eq('order_id', order.id)
        .maybeSingle();

      if (existingReview) {
        return {
          eligible: false,
          has_reviewed: true,
          existing_review: existingReview,
          reason: 'A review has already been submitted for this product from this order.',
        };
      }

      // Fetch product details for presentation
      const { data: product } = await db
        .from('products')
        .select('id, title, slug, cover_image_url, format')
        .eq('id', targetItem.product_id)
        .maybeSingle();

      const customerName = order.shipping_address?.full_name || 'Collector';
      const safeDisplayName = toPrivacySafeName(customerName);

      return {
        eligible: true,
        order: {
          id: order.id,
          order_number: order.order_number,
        },
        product: product || {
          id: targetItem.product_id,
          title: targetItem.product_title,
          cover_image_url: '/catalog/the-mandalorian-seasons-1-3.jpeg',
          format: 'DVD',
        },
        suggested_name: safeDisplayName,
        privacy_notice: 'Only your first name and verified purchase status will be displayed publicly.',
      };
    }

    // 1B. Homepage Testimonials Carousel
    if (testimonials) {
      const limit = Math.max(1, Math.min(20, parseInt(url.searchParams.get('limit') || '10', 10)));

      // Query approved reviews joined with product title & slug
      const { data, error } = await db
        .from('reviews')
        .select(`
          id,
          rating,
          title,
          comment,
          reviewer_name,
          is_verified_purchase,
          created_at,
          product:products (
            id,
            title,
            slug,
            cover_image_url
          )
        `)
        .eq('status', 'approved')
        .order('rating', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('[reviews API] Could not load testimonials:', error.message);
        return { testimonials: [] };
      }

      // Strictly sanitize: NEVER leak user_id, order_id, email, address, or moderation internal fields
      const sanitizedTestimonials = (data || []).map((row) => ({
        id: row.id,
        rating: row.rating,
        title: row.title,
        comment: row.comment,
        reviewer_name: toPrivacySafeName(row.reviewer_name),
        is_verified_purchase: Boolean(row.is_verified_purchase),
        created_at: row.created_at,
        product: row.product
          ? {
              id: row.product.id,
              title: row.product.title,
              slug: row.product.slug,
              cover_image_url: row.product.cover_image_url,
            }
          : null,
      }));

      return {
        testimonials: sanitizedTestimonials,
        total: sanitizedTestimonials.length,
      };
    }

    // 1C. Product Reviews (by product_id)
    if (productId) {
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
      const limit = Math.max(1, Math.min(50, parseInt(url.searchParams.get('limit') || '10', 10)));
      const offset = (page - 1) * limit;

      const { data, count, error } = await db
        .from('reviews')
        .select('id, rating, title, comment, reviewer_name, is_verified_purchase, created_at', { count: 'exact' })
        .eq('product_id', productId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return { reviews: [], total: 0 };
      }

      const sanitized = (data || []).map((r) => ({
        ...r,
        reviewer_name: toPrivacySafeName(r.reviewer_name),
      }));

      return {
        reviews: sanitized,
        total: count || 0,
        page,
        limit,
      };
    }

    throw new CheckoutError('Invalid reviews query parameters.', 400);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. POST Request: Submit Customer Review
  // ───────────────────────────────────────────────────────────────────────────
  if (method === 'POST') {
    // Sliding-window rate limit (max 10 submissions per minute per IP)
    const rateCheck = checkRateLimit(`review-submit:${clientIp}`, { max: 10, windowMs: 60000 });
    if (!rateCheck.allowed) {
      throw new CheckoutError('Too many submissions. Please wait a moment and try again.', 429, 'RATE_LIMITED');
    }

    const payload = sanitizeInputObject(req.body || {});
    const { orderId, productId, rating, title, comment, reviewerName, token } = payload;

    // Validate Rating (1 to 5)
    const numericRating = Math.round(Number(rating));
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      throw new CheckoutError('Rating must be an integer between 1 and 5 stars.', 400, 'INVALID_RATING');
    }

    // Validate Title (2 to 120 chars)
    const cleanTitle = (title || '').trim();
    if (!cleanTitle || cleanTitle.length < 2) {
      throw new CheckoutError('Review headline must be at least 2 characters.', 400, 'INVALID_TITLE');
    }
    if (cleanTitle.length > 120) {
      throw new CheckoutError('Review headline cannot exceed 120 characters.', 400, 'INVALID_TITLE');
    }

    // Validate Comment (5 to 2000 chars)
    const cleanComment = (comment || '').trim();
    if (!cleanComment || cleanComment.length < 5) {
      throw new CheckoutError('Review comment must be at least 5 characters.', 400, 'INVALID_COMMENT');
    }
    if (cleanComment.length > 2000) {
      throw new CheckoutError('Review comment cannot exceed 2,000 characters.', 400, 'INVALID_COMMENT');
    }

    if (!productId || typeof productId !== 'string') {
      throw new CheckoutError('Product ID is required.', 400, 'MISSING_PRODUCT');
    }

    let authenticatedUser = null;
    try {
      authenticatedUser = await requestUser(db, req);
    } catch {}

    // Verify Verified Purchase Relationship
    let verifiedOrderId = null;
    let verifiedOrderItemId = null;
    let customerEmail = null;

    if (orderId) {
      let ordQuery = db
        .from('orders')
        .select('id, user_id, email, payment_status, status, review_token, order_items(id, product_id)')
        .eq('id', orderId);

      const { data: matchingOrder } = await ordQuery.maybeSingle();

      if (matchingOrder) {
        // Must be paid and completed
        if (matchingOrder.payment_status === 'paid' && !['cancelled', 'refunded'].includes(matchingOrder.status)) {
          // Token or user authorization
          const isTokenAuthorized = token && matchingOrder.review_token === token;
          const isUserAuthorized = authenticatedUser && matchingOrder.user_id === authenticatedUser.id;

          if (isTokenAuthorized || isUserAuthorized) {
            const matchingItem = (matchingOrder.order_items || []).find((i) => i.product_id === productId);
            if (matchingItem) {
              verifiedOrderId = matchingOrder.id;
              verifiedOrderItemId = matchingItem.id;
              customerEmail = matchingOrder.email;
            }
          }
        }
      }
    }

    // If orderId not directly provided, check if authenticated user purchased it
    if (!verifiedOrderId && authenticatedUser) {
      const { data: userOrders } = await db
        .from('orders')
        .select('id, user_id, email, payment_status, status, order_items(id, product_id)')
        .eq('user_id', authenticatedUser.id)
        .eq('payment_status', 'paid')
        .not('status', 'in', '("cancelled","refunded")')
        .order('created_at', { ascending: false });

      if (userOrders) {
        for (const ord of userOrders) {
          const item = (ord.order_items || []).find((i) => i.product_id === productId);
          if (item) {
            verifiedOrderId = ord.id;
            verifiedOrderItemId = item.id;
            customerEmail = ord.email;
            break;
          }
        }
      }
    }

    // Enforce genuine customer purchase verification:
    // Customers can only review products they actually purchased in an eligible order!
    if (!verifiedOrderId) {
      throw new CheckoutError(
        'Only customers who have purchased this product in a verified order can submit a review.',
        403,
        'VERIFIED_PURCHASE_REQUIRED'
      );
    }

    // Prevent duplicate review for the same order & product
    const { data: existing } = await db
      .from('reviews')
      .select('id')
      .eq('product_id', productId)
      .eq('order_id', verifiedOrderId)
      .maybeSingle();

    if (existing) {
      throw new CheckoutError('A review has already been submitted for this order.', 409, 'DUPLICATE_REVIEW');
    }

    const safeName = toPrivacySafeName(reviewerName || authenticatedUser?.user_metadata?.full_name);

    // Insert into database with status = 'pending' (human moderation required)
    const reviewRecord = {
      product_id: productId,
      order_id: verifiedOrderId,
      order_item_id: verifiedOrderItemId,
      user_id: authenticatedUser?.id || null,
      customer_email: customerEmail,
      rating: numericRating,
      title: cleanTitle,
      comment: cleanComment,
      reviewer_name: safeName,
      is_verified_purchase: true,
      status: 'pending', // Never self-approved
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertErr } = await db
      .from('reviews')
      .insert(reviewRecord)
      .select('id, rating, title, status, is_verified_purchase, created_at')
      .single();

    if (insertErr) {
      console.error('[reviews API] Insert error:', insertErr);
      throw new CheckoutError(insertErr.message || 'Could not save review.', 500, 'DATABASE_ERROR');
    }

    return {
      success: true,
      reviewId: inserted.id,
      status: 'pending',
      message: 'Thank you! Your verified review has been submitted for moderation.',
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. PATCH Request: Admin Moderation (Approve / Reject)
  // ───────────────────────────────────────────────────────────────────────────
  if (method === 'PATCH') {
    const user = await requestUser(db, req);
    if (!user) {
      throw new CheckoutError('Sign in required for moderation.', 401, 'AUTH_REQUIRED');
    }

    const email = (user.email || '').toLowerCase().trim();
    let isAuthorized = MASTER_ADMIN_EMAILS.has(email) || user.app_metadata?.role === 'admin' || user.app_metadata?.role === 'staff';

    if (!isAuthorized) {
      const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
      isAuthorized = Boolean(profile && ['admin', 'staff'].includes(profile.role));
    }

    if (!isAuthorized) {
      throw new CheckoutError('Administrative privileges required to moderate reviews.', 403, 'FORBIDDEN');
    }

    const payload = sanitizeInputObject(req.body || {});
    const { reviewId, status, moderationNote } = payload;

    if (!reviewId || !['approved', 'rejected', 'pending'].includes(status)) {
      throw new CheckoutError('Invalid review ID or moderation status.', 400, 'INVALID_PAYLOAD');
    }

    const { data: updated, error: updateErr } = await db
      .from('reviews')
      .update({
        status,
        moderated_by: user.id,
        moderated_at: new Date().toISOString(),
        moderation_note: moderationNote?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .select('*')
      .single();

    if (updateErr || !updated) {
      throw new CheckoutError('Failed to update review moderation status.', 500, 'UPDATE_FAILED');
    }

    return {
      success: true,
      review: updated,
    };
  }

  throw new CheckoutError(`Method ${method} not allowed`, 405);
}, ['GET', 'POST', 'PATCH'], { max: 120, windowMs: 60000 });
