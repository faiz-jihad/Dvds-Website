import { dbClient, endpoint, requestUser, CheckoutError } from './_checkout.js';

const MASTER_ADMIN_EMAILS = new Set([
  'azrayanltd@gmail.com',
  'admin@dvdszone.co.uk',
  'admin@azrayan.co.uk',
  'faizalba74@gmail.com',
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

  // 3. Load existing row to match actual database columns
  const { data: existing, error: readError } = await db
    .from('store_settings')
    .select('*')
    .eq('singleton', true)
    .maybeSingle();

  if (readError) {
    throw new CheckoutError('Failed to load store settings from database.', 500, 'DB_READ_ERROR');
  }

  const allowedColumns = existing ? new Set(Object.keys(existing)) : null;

  // 4. Sanitize and validate fields
  const sanitized = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === 'id') continue;
    if (!allowedColumns || allowedColumns.has(key)) {
      sanitized[key] = value;
    }
  }

  // Numeric sanitization for delivery & thresholds
  if ('standard_shipping_fee' in input) {
    sanitized.standard_shipping_fee = Math.max(0, Math.round(Number(input.standard_shipping_fee || 0) * 100) / 100);
  }
  if ('free_shipping_threshold' in input) {
    sanitized.free_shipping_threshold = Math.max(0, Math.round(Number(input.free_shipping_threshold || 0) * 100) / 100);
  }
  if ('express_shipping_fee' in input) {
    sanitized.express_shipping_fee = Math.max(0, Math.round(Number(input.express_shipping_fee || 0) * 100) / 100);
  }
  if ('low_stock_threshold' in input) {
    sanitized.low_stock_threshold = Math.max(0, Math.round(Number(input.low_stock_threshold || 5)));
  }
  if ('budget_collection_threshold' in input) {
    sanitized.budget_collection_threshold = Math.max(0, Math.round(Number(input.budget_collection_threshold || 8) * 100) / 100);
  }

  // Strict compliance & jurisdiction sanitation
  sanitized.registered_office_address = 'United Kingdom';
  sanitized.warehouse_location = 'United Kingdom';
  if (!sanitized.store_name || sanitized.store_name.includes('AZ Rayan')) {
    sanitized.store_name = 'DVDs Zone';
  }
  if (!sanitized.registered_company_name || sanitized.registered_company_name.includes('AZ Rayan')) {
    sanitized.registered_company_name = 'DVDs Zone';
  }
  const rawEmail = (sanitized.support_email || '').trim();
  sanitized.support_email = (!rawEmail || rawEmail.includes('azrayan.co.uk') || rawEmail.includes('concierge'))
    ? 'azrayanltd@gmail.com'
    : rawEmail;
  sanitized.support_phone = (sanitized.support_phone || '').trim() || '00447400320038';

  sanitized.singleton = true;
  sanitized.updated_at = new Date().toISOString();

  // 5. Update or insert with service role credentials
  const { data: updated, error: saveError } = existing
    ? await db.from('store_settings').update(sanitized).eq('id', existing.id).select('*').single()
    : await db.from('store_settings').insert(sanitized).select('*').single();

  if (saveError) {
    console.error('[admin-store-settings] Save error:', saveError);
    throw new CheckoutError(`Failed to persist store settings: ${saveError.message}`, 500, 'DB_SAVE_ERROR');
  }

  return { success: true, settings: updated };
}, 'POST', { max: 30, windowMs: 60000 });
