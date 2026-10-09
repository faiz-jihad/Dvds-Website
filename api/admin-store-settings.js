import { dbClient, endpoint, requestUser, CheckoutError } from './_checkout.js';
import { createClient } from '@supabase/supabase-js';

const MASTER_ADMIN_EMAILS = new Set([
  'azrayanltd@gmail.com',
  'admin@dvdszone.co.uk',
  'admin@azrayan.co.uk',
  'faizalba74@gmail.com',
]);

const VIRTUAL_HERO_COLUMNS = new Set([
  'hero_youtube_enabled', 'hero_youtube_url', 'hero_youtube_mute', 'hero_youtube_loop',
  'hero_youtube_start_minutes', 'hero_youtube_start_seconds', 'hero_youtube_end_minutes', 'hero_youtube_end_seconds',
  'hero_trailers'
]);

const CORE_COLUMNS = new Set([
  'singleton', 'store_name', 'registered_company_name', 'company_number',
  'registered_office_address', 'warehouse_location', 'support_email', 'support_phone',
  'free_shipping_threshold', 'standard_shipping_fee', 'express_shipping_fee',
  'standard_shipping_name', 'standard_shipping_eta', 'express_shipping_name', 'express_shipping_eta',
  'low_stock_threshold', 'budget_collection_threshold', 'dispatch_cutoff_time',
  'deal_product_id', 'deal_discount_price', 'deal_ends_at', 'deal_is_active',
  'director_badge', 'director_name', 'director_quote', 'director_bio', 'director_product_ids',
  'vip_promo_code', 'vip_promo_discount', 'vip_min_spend',
  'seo_site_url', 'seo_site_title', 'seo_site_description', 'seo_social_image_url', 'seo_organization_description',
  'hero_badge_text', 'hero_headline_line1', 'hero_headline_highlight', 'hero_subheadline',
  'hero_cta_primary', 'hero_cta_secondary', 'hero_bg_image',
  'announcement_left', 'announcement_center', 'announcement_link',
  'bank_name', 'bank_account_name', 'bank_sort_code', 'bank_account_number', 'bank_iban', 'bank_payment_instructions',
  'campaign_is_active', 'campaign_title', 'campaign_badge', 'campaign_tagline', 'campaign_discount_text', 'campaign_ends_at',
  'custom_formats', 'shipping_zones', 'checkout_currencies', 'international_duties_notice',
  'payment_card_enabled', 'payment_paypal_enabled', 'payment_bank_transfer_enabled',
  'updated_at'
]);

export default endpoint(async (req) => {
  const db = dbClient();

  // 1. Authenticate administrative user
  const user = await requestUser(db, req);
  if (!user) {
    throw new CheckoutError('Sign in to access administrative settings.', 401, 'AUTH_REQUIRED');
  }

  const email = (user.email || '').toLowerCase().trim();
  const isMaster = MASTER_ADMIN_EMAILS.has(email);

  let isAuthorized = isMaster || user.app_metadata?.role === 'admin' || user.app_metadata?.role === 'staff';
  if (!isAuthorized) {
    const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
    isAuthorized = Boolean(profile && ['admin', 'staff'].includes(profile.role));
  }

  if (!isAuthorized) {
    throw new CheckoutError('Administrative privileges required to modify store settings.', 403, 'FORBIDDEN');
  }

  // 2. Extract settings payload
  const input = (req.body?.settings || req.body) || {};

  // 3. Load existing row
  let { data: existing, error: readError } = await db
    .from('store_settings')
    .select('*')
    .eq('singleton', true)
    .maybeSingle();

  if (!existing) {
    const { data: fallbackRow } = await db
      .from('store_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (fallbackRow) existing = fallbackRow;
  }

  const dbColumns = existing ? new Set(Object.keys(existing)) : CORE_COLUMNS;

  // 4. Sanitize and validate fields
  const sanitized = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === 'id') continue;
    // Do not pass virtual hero columns directly into Postgres if the column does not physically exist in the DB
    if (VIRTUAL_HERO_COLUMNS.has(key) && (!existing || !dbColumns.has(key))) {
      continue;
    }
    if (dbColumns.has(key) || CORE_COLUMNS.has(key)) {
      sanitized[key] = value;
    }
  }

  // Persist hero trailers and youtube config into hero_bg_image fallback so it is 100% saved in Postgres
  if (Array.isArray(input.hero_trailers) || input.hero_youtube_enabled !== undefined) {
    const heroMeta = {
      hero_trailers: Array.isArray(input.hero_trailers) ? input.hero_trailers : [],
      hero_youtube_enabled: Boolean(input.hero_youtube_enabled),
      hero_youtube_url: input.hero_youtube_url || '',
      hero_youtube_mute: input.hero_youtube_mute ?? true,
      hero_youtube_loop: input.hero_youtube_loop ?? true,
      hero_youtube_start_minutes: Number(input.hero_youtube_start_minutes || 0),
      hero_youtube_start_seconds: Number(input.hero_youtube_start_seconds || 0),
      hero_youtube_end_minutes: input.hero_youtube_end_minutes !== undefined ? Number(input.hero_youtube_end_minutes) : 1,
      hero_youtube_end_seconds: input.hero_youtube_end_seconds !== undefined ? Number(input.hero_youtube_end_seconds) : 30,
    };
    sanitized.hero_bg_image = `HERO_META:${JSON.stringify(heroMeta)}`;
    if (existing && 'hero_trailers' in existing && Array.isArray(input.hero_trailers)) {
      sanitized.hero_trailers = input.hero_trailers;
    }
  }

  // Numeric sanitization for delivery & thresholds (never NaN or empty strings)
  if ('standard_shipping_fee' in input && dbColumns.has('standard_shipping_fee')) {
    sanitized.standard_shipping_fee = Math.max(0, Math.round(Number(input.standard_shipping_fee || 0) * 100) / 100);
  }
  if ('free_shipping_threshold' in input && dbColumns.has('free_shipping_threshold')) {
    sanitized.free_shipping_threshold = Math.max(0, Math.round(Number(input.free_shipping_threshold || 0) * 100) / 100);
  }
  if ('express_shipping_fee' in input && dbColumns.has('express_shipping_fee')) {
    sanitized.express_shipping_fee = Math.max(0, Math.round(Number(input.express_shipping_fee || 0) * 100) / 100);
  }
  if ('low_stock_threshold' in input && dbColumns.has('low_stock_threshold')) {
    sanitized.low_stock_threshold = Math.max(0, Math.round(Number(input.low_stock_threshold || 5)));
  }
  if ('budget_collection_threshold' in input && dbColumns.has('budget_collection_threshold')) {
    sanitized.budget_collection_threshold = Math.max(0, Math.round(Number(input.budget_collection_threshold || 8) * 100) / 100);
  }

  // Strict compliance & jurisdiction sanitation
  if (dbColumns.has('registered_office_address')) sanitized.registered_office_address = 'United Kingdom';
  if (dbColumns.has('warehouse_location')) sanitized.warehouse_location = 'United Kingdom';
  if (dbColumns.has('store_name')) {
    if (!sanitized.store_name || sanitized.store_name.includes('AZ Rayan')) sanitized.store_name = 'DVDs Zone';
  }
  if (dbColumns.has('registered_company_name')) {
    if (!sanitized.registered_company_name || sanitized.registered_company_name.includes('AZ Rayan')) sanitized.registered_company_name = 'DVDs Zone';
  }
  if (dbColumns.has('support_email')) {
    const rawEmail = (sanitized.support_email || '').trim();
    sanitized.support_email = (!rawEmail || rawEmail.includes('azrayan.co.uk') || rawEmail.includes('concierge'))
      ? 'azrayanltd@gmail.com'
      : rawEmail;
  }
  if (dbColumns.has('support_phone')) {
    sanitized.support_phone = (sanitized.support_phone || '').trim() || '00447400320038';
  }

  sanitized.singleton = true;
  sanitized.updated_at = new Date().toISOString();

  // 5. Update or insert
  let updated = null;
  let saveError = null;

  const trySave = async (payloadToSave, clientInstance) => {
    return existing
      ? await clientInstance.from('store_settings').update(payloadToSave).eq('id', existing.id).select('*').single()
      : await clientInstance.from('store_settings').insert(payloadToSave).select('*').single();
  };

  const isSchemaColumnError = (err) =>
    Boolean(
      err && (
        err.code === '42703' ||
        err.code === 'PGRST204' ||
        err.code === 'PGRST200' ||
        err.code === 'PGRST202' ||
        err.code === 'PGRST205' ||
        err.message?.includes('does not exist') ||
        err.message?.includes('schema cache') ||
        err.message?.includes('column') ||
        err.message?.includes('Could not find')
      )
    );

  const res = await trySave(sanitized, db);
  updated = res.data;
  saveError = res.error;

  // If column error occurred, prune unrecognized columns and retry
  if (saveError && isSchemaColumnError(saveError)) {
    console.warn('[admin-store-settings] Schema column mismatch on save, retrying with core columns:', saveError.message);
    const nonCoreColumns = new Set([
      'campaign_is_active', 'campaign_title', 'campaign_badge', 'campaign_tagline',
      'campaign_discount_text', 'campaign_ends_at', 'custom_formats',
      'shipping_zones', 'checkout_currencies', 'international_duties_notice',
      ...VIRTUAL_HERO_COLUMNS
    ]);
    const corePayload = {};
    for (const [key, val] of Object.entries(sanitized)) {
      if (!nonCoreColumns.has(key)) {
        corePayload[key] = val;
      }
    }
    corePayload.singleton = true;
    corePayload.updated_at = new Date().toISOString();
    const retryRes = await trySave(corePayload, db);
    updated = retryRes.data;
    saveError = retryRes.error;
  }

  // If service-role update failed with RLS (e.g. service key was missing so client was anon), try with authenticated user client
  if (saveError && (saveError.code === '42501' || saveError.message?.includes('row-level security'))) {
    const authHeader = req.headers?.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (token && supabaseUrl && anonKey) {
      const userDb = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const userRes = await trySave(sanitized, userDb);
      if (!userRes.error && userRes.data) {
        updated = userRes.data;
        saveError = null;
      }
    }
  }

  if (saveError || !updated) {
    console.error('[admin-store-settings] Save error:', saveError);
    throw new CheckoutError(`Failed to persist store settings: ${saveError?.message || 'Unknown error'}`, 500, 'DB_SAVE_ERROR');
  }

  // Authoritatively unpack hero trailers and youtube settings from HERO_META or input
  if (updated.hero_bg_image && updated.hero_bg_image.startsWith('HERO_META:')) {
    try {
      const meta = JSON.parse(updated.hero_bg_image.slice('HERO_META:'.length));
      if (Array.isArray(meta.hero_trailers)) {
        updated.hero_trailers = meta.hero_trailers;
      }
      if (meta.hero_youtube_enabled !== undefined) updated.hero_youtube_enabled = meta.hero_youtube_enabled;
      if (meta.hero_youtube_url !== undefined) updated.hero_youtube_url = meta.hero_youtube_url;
      if (meta.hero_youtube_mute !== undefined) updated.hero_youtube_mute = meta.hero_youtube_mute;
      if (meta.hero_youtube_loop !== undefined) updated.hero_youtube_loop = meta.hero_youtube_loop;
      if (meta.hero_youtube_start_minutes !== undefined) updated.hero_youtube_start_minutes = meta.hero_youtube_start_minutes;
      if (meta.hero_youtube_start_seconds !== undefined) updated.hero_youtube_start_seconds = meta.hero_youtube_start_seconds;
      if (meta.hero_youtube_end_minutes !== undefined) updated.hero_youtube_end_minutes = meta.hero_youtube_end_minutes;
      if (meta.hero_youtube_end_seconds !== undefined) updated.hero_youtube_end_seconds = meta.hero_youtube_end_seconds;
    } catch {}
  }
  if (Array.isArray(input.hero_trailers)) {
    updated.hero_trailers = input.hero_trailers;
  }
  if (input.hero_youtube_enabled !== undefined) updated.hero_youtube_enabled = Boolean(input.hero_youtube_enabled);
  if (input.hero_youtube_url !== undefined) updated.hero_youtube_url = input.hero_youtube_url;
  if (input.hero_youtube_mute !== undefined) updated.hero_youtube_mute = input.hero_youtube_mute;
  if (input.hero_youtube_loop !== undefined) updated.hero_youtube_loop = input.hero_youtube_loop;
  if (input.hero_youtube_start_minutes !== undefined) updated.hero_youtube_start_minutes = input.hero_youtube_start_minutes;
  if (input.hero_youtube_start_seconds !== undefined) updated.hero_youtube_start_seconds = input.hero_youtube_start_seconds;
  if (input.hero_youtube_end_minutes !== undefined) updated.hero_youtube_end_minutes = input.hero_youtube_end_minutes;
  if (input.hero_youtube_end_seconds !== undefined) updated.hero_youtube_end_seconds = input.hero_youtube_end_seconds;

  return { success: true, settings: updated };
}, 'POST', { max: 30, windowMs: 60000 });
