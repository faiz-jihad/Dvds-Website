import { isSupabaseConfigured, supabase } from './supabase';
import { Category, FinancialStats, FulfilmentStatus, Genre, Order, OrderStatus, Product, Promotion, StoreSettings, Profile, UserRole } from '../types';
import { adminSchemaChecks, AdminSchemaScope } from './adminSchema';
import { DEFAULT_STORE_SETTINGS } from '../data/defaultStoreSettings';
import { CURRENCIES, validateShippingZones } from '../../shared/commerce.js';

export interface InventoryMovement {
  id: string;
  product_id: string;
  quantity_before: number;
  quantity_delta: number;
  quantity_after: number;
  reason: string;
  actor_id: string | null;
  created_at: string;
  product?: { id: string; title: string; sku: string };
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  previous_status: string | null;
  new_status: string;
  previous_fulfilment_status: string | null;
  new_fulfilment_status: string;
  note: string | null;
  actor_id: string | null;
  created_at: string;
  order?: { id: string; order_number: string };
}

export interface AdminAuditEntry {
  id: string;
  actor_id: string | null;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  order_reference: string | null;
  message: string;
  status: 'new' | 'in_progress' | 'resolved';
  assigned_to: string | null;
  internal_note: string | null;
  created_at: string;
  updated_at: string;
}

export class AdminBackendError extends Error {
  constructor(message: string, public readonly code = 'ADMIN_BACKEND_ERROR', public readonly details: readonly string[] = []) {
    super(message);
    this.name = 'AdminBackendError';
  }
}

const SCHEMA_ERROR_CODES = new Set(['PGRST202', 'PGRST204', 'PGRST205', '42P01', '42883', '42703']);

function client() {
  if (!isSupabaseConfigured || !supabase) {
    throw new AdminBackendError(
      'Operational backend is not connected. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before using the admin dashboard.',
      'BACKEND_NOT_CONFIGURED'
    );
  }
  return supabase;
}

function fail(error: any, fallback: string): never {
  if (error?.code && SCHEMA_ERROR_CODES.has(error.code)) {
    throw new AdminBackendError(
      `${fallback} A required database table, column or function is missing.`,
      'SCHEMA_NOT_READY',
      [error.message || error.code]
    );
  }
  if (error?.code === '42501' || error?.message?.includes('row-level security')) {
    throw new AdminBackendError(
      'Admin access required: Row-level security prevented this modification. Sign in with a Supabase account that has permission for this action.',
      'RLS_PERMISSION_DENIED'
    );
  }
  if (error?.code === '22P02' || error?.message?.includes('invalid input syntax for type uuid')) {
    throw new AdminBackendError(
      'Invalid UUID identifier for database record.',
      'INVALID_UUID'
    );
  }
  if (error?.message?.includes('products_active_price_required')) {
    throw new AdminBackendError(
      'Active films must have a price greater than £0.00. Please enter a valid sale price in Pricing or select Draft.',
      'ACTIVE_PRICE_REQUIRED'
    );
  }
  throw new AdminBackendError(error?.message || fallback, error?.code || 'QUERY_FAILED');
}

function normalizeOrder(row: any): Order {
  return {
    ...row,
    subtotal: Number(row.subtotal),
    shipping_amount: Number(row.shipping_amount),
    discount_amount: Number(row.discount_amount),
    total_amount: Number(row.total_amount),
    refunded_amount: Number(row.refunded_amount || 0),
    shipping_address: row.shipping_address || {},
    items: (row.items || []).map((item: any) => ({
      ...item,
      unit_price: Number(item.unit_price),
      total_price: Number(item.total_price),
      cover_image_url: item.product_snapshot?.cover_image_url || undefined,
    })),
  } as Order;
}

export const adminApi = {
  isConfigured: isSupabaseConfigured,

  async checkSchema(scope: AdminSchemaScope = 'all'): Promise<{ tables: readonly string[] }> {
    // These are read-only checks. Opening a page must never invoke mutation RPCs.
    const results = await Promise.all(adminSchemaChecks(scope).map(async ({ table, columns }) => {
      const { error } = await client().from(table).select(columns).limit(0);
      return { table, error };
    }));
    const connectionError = results.find(({ error }) => error && !SCHEMA_ERROR_CODES.has(error.code));
    if (connectionError) fail(connectionError.error, `Could not check ${connectionError.table}.`);
    const missing = results.filter(({ error }) => error);
    if (missing.length) {
      throw new AdminBackendError(
        'This page needs a database update. Other admin pages remain available.',
        'SCHEMA_NOT_READY',
        missing.map(({ table, error }) => `${table}: ${error?.message || 'Required schema is missing'}`),
      );
    }
    return { tables: results.map(({ table }) => table) };
  },

  async getProducts(): Promise<Product[]> {
    const { data, error } = await client().from('products')
      .select('*, category:categories(*), product_genres(genre:genres(*))')
      .order('created_at', { ascending: false });
    if (error) fail(error, 'Products could not be loaded.');
    return (data || []).map((row: any) => ({ ...row, price: Number(row.price),
      compare_at_price: row.compare_at_price == null ? null : Number(row.compare_at_price),
      genres: (row.product_genres || []).map((link: any) => link.genre).filter(Boolean) }));
  },

  async getCategories(): Promise<Category[]> {
    const { data, error } = await client().from('categories').select('*').order('sort_order');
    if (error) fail(error, 'Categories could not be loaded.');
    return (data || []) as Category[];
  },

  async createCategory(input: Omit<Category, 'id'>): Promise<Category> {
    const { data, error } = await client().from('categories').insert(input).select('*').single();
    if (error || !data) fail(error, 'Category could not be saved.');
    return data as Category;
  },

  async updateCategory(id: string, input: Partial<Category>): Promise<Category> {
    const { data, error } = await client().from('categories').update(input).eq('id', id).select('*').single();
    if (error || !data) fail(error, 'Category could not be saved.');
    return data as Category;
  },

  async deleteCategory(id: string): Promise<void> {
    const { data, error } = await client().from('categories').delete().eq('id', id).select('id').single();
    if (error || !data) fail(error, 'Category was not deleted. It may no longer exist or access was denied.');
  },

  async getGenres(): Promise<Genre[]> {
    const { data, error } = await client().from('genres').select('*').order('name');
    if (error) fail(error, 'Genres could not be loaded.');
    return (data || []) as Genre[];
  },

  async createGenre(input: Omit<Genre, 'id'>): Promise<Genre> {
    const { data, error } = await client().from('genres').insert(input).select('*').single();
    if (error || !data) fail(error, 'Genre could not be saved.');
    return data as Genre;
  },

  async updateGenre(id: string, input: Partial<Genre>): Promise<Genre> {
    const { data, error } = await client().from('genres').update(input).eq('id', id).select('*').single();
    if (error || !data) fail(error, 'Genre could not be saved.');
    return data as Genre;
  },

  async deleteGenre(id: string): Promise<void> {
    const { data, error } = await client().from('genres').delete().eq('id', id).select('id').single();
    if (error || !data) fail(error, 'Genre was not deleted. It may no longer exist or access was denied.');
  },

  async saveProductWithGenres(id: string | null, fields: Partial<Product>, genreIds: string[]): Promise<Product> {
    const { data, error } = await client().rpc('save_admin_product', {
      p_product_id: id, p_fields: fields, p_genre_ids: genreIds,
    });
    if (error || !data) fail(error, 'Product and genres could not be saved.');
    return data as Product;
  },

  async createProduct(input: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category' | 'genres'>): Promise<Product> {
    const { data, error } = await client().from('products').insert(input).select('*').single();
    if (error || !data) fail(error, 'Product could not be created.');
    return data as Product;
  },

  async updateProduct(id: string, input: Partial<Product>): Promise<Product> {
    const { id: ignoredId, category, genres, created_at, ...payload } = input;
    const { data, error } = await client().from('products').update(payload).eq('id', id).select('*').single();
    if (error || !data) fail(error, 'Product could not be updated.');
    return data as Product;
  },

  async setProductGenres(productId: string, genreIds: string[]): Promise<void> {
    const { error } = await client().rpc('set_product_genres', { p_product_id: productId, p_genre_ids: genreIds });
    if (error) fail(error, 'Product genres could not be updated.');
  },

  async archiveProduct(id: string): Promise<void> {
    await adminApi.updateProduct(id, { status: 'archived' });
  },

  async deleteProduct(id: string): Promise<void> {
    const { data, error } = await client().from('products').delete().eq('id', id).select('id').single();
    if (error?.code === '23503') throw new AdminBackendError('This product has transaction or inventory history. Archive it to preserve those records.');
    if (error || !data) fail(error, 'Product could not be deleted.');
  },

  async getOrders(): Promise<Order[]> {
    const { data, error } = await client().from('orders').select('*, items:order_items(*)').order('created_at', { ascending: false });
    if (error) fail(error, 'Orders could not be loaded.');
    return (data || []).map(normalizeOrder);
  },

  async updateOrderStatus(orderId: string, status: OrderStatus, fulfilmentStatus: FulfilmentStatus,
    details?: { carrier?: string; trackingNumber?: string; note?: string }): Promise<Order> {
    const { error } = await client().rpc('transition_order_status', {
      p_order_id: orderId, p_status: status, p_fulfilment_status: fulfilmentStatus,
      p_carrier: details?.carrier?.trim() || null, p_tracking_number: details?.trackingNumber?.trim() || null,
      p_note: details?.note?.trim() || null,
    });
    if (error) fail(error, 'Order status could not be updated.');
    const { data, error: readError } = await client().from('orders').select('*, items:order_items(*)').eq('id', orderId).single();
    if (readError || !data) fail(readError, 'Order was updated but could not be reloaded. Refresh the orders list.');
    return normalizeOrder(data);
  },

  async confirmBankTransferPayment(orderId: string, adminNote?: string): Promise<Order> {
    const { error } = await client().rpc('confirm_bank_transfer_payment', { p_order_id: orderId, p_note: adminNote?.trim() || null });
    if (error) fail(error, 'Bank transfer payment could not be confirmed.');
    const { data, error: readError } = await client().from('orders').select('*, items:order_items(*)').eq('id', orderId).single();
    if (readError || !data) fail(readError, 'Payment was confirmed but the order could not be reloaded. Refresh the orders list.');
    return normalizeOrder(data);
  },

  async adjustStock(productId: string, delta: number, reason: string): Promise<Product> {
    if (!Number.isInteger(delta) || delta === 0 || reason.trim().length < 3) {
      throw new AdminBackendError('Enter a non-zero whole-number adjustment and a reason of at least 3 characters.');
    }
    const { data, error } = await client().rpc('adjust_product_stock', { p_product_id: productId, p_delta: delta, p_reason: reason.trim() });
    if (error) fail(error, 'Inventory could not be adjusted.');
    const product = Array.isArray(data) ? data[0] : data;
    if (!product) fail(null, 'Inventory adjustment returned no product.');
    return product as Product;
  },

  async getPromotions(): Promise<Promotion[]> {
    const { data, error } = await client().from('promotions').select('*').order('created_at', { ascending: false });
    if (error) fail(error, 'Promotions could not be loaded.');
    return (data || []).map((row: any) => ({ ...row, value: Number(row.value), minimum_order: Number(row.minimum_order) }));
  },

  async createPromotion(input: Omit<Promotion, 'id'>): Promise<Promotion> {
    const { data, error } = await client().from('promotions').insert({ ...input, code: input.code.trim().toUpperCase() }).select('*').single();
    if (error || !data) fail(error, 'Promotion could not be created.');
    return data as Promotion;
  },

  async updatePromotion(id: string, input: Partial<Promotion>): Promise<Promotion> {
    const payload = { ...input, ...(input.code == null ? {} : { code: input.code.trim().toUpperCase() }) };
    const { data, error } = await client().from('promotions').update(payload).eq('id', id).select('*').single();
    if (error || !data) fail(error, 'Promotion could not be updated.');
    return data as Promotion;
  },

  async deletePromotion(id: string): Promise<void> {
    const { data, error } = await client().from('promotions').delete().eq('id', id).select('id').single();
    if (error || !data) fail(error, 'Promotion could not be deleted.');
  },

  async getStoreSettings(): Promise<StoreSettings | null> {
    const { data, error } = await client().from('store_settings').select('*').eq('singleton', true).maybeSingle();
    if (error) fail(error, 'Store settings could not be loaded.');
    return data ? { ...DEFAULT_STORE_SETTINGS, ...data } as StoreSettings : null;
  },

  async saveStoreSettings(input: StoreSettings): Promise<StoreSettings> {
    if (input.shipping_zones) validateShippingZones(input.shipping_zones);
    if (input.checkout_currencies && (!input.checkout_currencies.includes('GBP') || input.checkout_currencies.some((currency) => !CURRENCIES.includes(currency)))) throw new Error('Enable GBP and select supported checkout currencies.');
    const { data: existing, error: readError } = await client().from('store_settings').select('id').eq('singleton', true).maybeSingle();
    if (readError) fail(readError, 'Store settings could not be loaded before saving.');
    const { id, ...values } = input;
    const payload = { ...values, singleton: true, updated_at: new Date().toISOString() };
    
    let result = existing
      ? await client().from('store_settings').update(payload).eq('id', existing.id).select('*').single()
      : await client().from('store_settings').insert(payload).select('*').single();

    // If saving fails due to columns not existing in DB schema (e.g. shipping_zones, checkout_currencies, international_duties_notice)
    if (result.error && (result.error.code === '42703' || result.error.message?.includes('does not exist'))) {
      const { shipping_zones, checkout_currencies, international_duties_notice, ...legacyValues } = values as any;
      const legacyPayload = { ...legacyValues, singleton: true, updated_at: new Date().toISOString() };
      result = existing
        ? await client().from('store_settings').update(legacyPayload).eq('id', existing.id).select('*').single()
        : await client().from('store_settings').insert(legacyPayload).select('*').single();
    }

    if (result.error || !result.data) fail(result.error, 'Store settings could not be saved.');
    return { ...DEFAULT_STORE_SETTINGS, ...result.data } as StoreSettings;
  },

  async getFinancialStats(): Promise<FinancialStats> {
    const [orders, products, settings] = await Promise.all([adminApi.getOrders(), adminApi.getProducts(), adminApi.getStoreSettings()]);
    const today = new Date().toISOString().slice(0, 10);
    const paidOrders = orders.filter((order) => ['paid', 'partially_refunded', 'refunded'].includes(order.payment_status));
    const netAmount = (order: Order) => order.payment_status === 'refunded' ? 0 : Math.round(Math.max(0, order.total_amount - Number(order.refunded_amount || 0)) / Number(order.exchange_rate || 1) * 100) / 100;
    const totalRevenue = paidOrders.reduce((sum, order) => sum + netAmount(order), 0);
    const todayPaid = paidOrders.filter((order) => (order.paid_at || order.created_at).slice(0, 10) === today);
    const buckets = new Map<string, { amount: number; orders: number }>();

    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      buckets.set(date.toISOString().slice(0, 10), { amount: 0, orders: 0 });
    }
    paidOrders.forEach((order) => {
      const key = (order.paid_at || order.created_at).slice(0, 10);
      const bucket = buckets.get(key);
      if (bucket) buckets.set(key, { amount: bucket.amount + netAmount(order), orders: bucket.orders + 1 });
    });

    return {
      settingsConfigured: Boolean(settings),
      totalRevenue,
      todayRevenue: todayPaid.reduce((sum, order) => sum + netAmount(order), 0),
      totalOrders: orders.length,
      todayOrders: orders.filter((order) => order.created_at.slice(0, 10) === today).length,
      averageOrderValue: paidOrders.length ? totalRevenue / paidOrders.length : 0,
      lowStockCount: settings
        ? products.filter((product) => product.stock_quantity <= settings.low_stock_threshold && product.status === 'active').length
        : 0,
      dailyRevenue: Array.from(buckets.entries()).map(([date, value]) => ({
        date: new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        ...value,
      })),
      recentOrders: orders.slice(0, 8),
    };
  },

  async getOperationalActivity(): Promise<{
    inventory: InventoryMovement[];
    orders: OrderStatusHistory[];
    audit: AdminAuditEntry[];
  }> {
    const [inventoryResult, orderResult, auditResult] = await Promise.all([
      client()
        .from('inventory_movements')
        .select('*, product:products(id,title,sku)')
        .order('created_at', { ascending: false })
        .limit(100),
      client()
        .from('order_status_history')
        .select('*, order:orders(id,order_number)')
        .order('created_at', { ascending: false })
        .limit(100),
      client()
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100),
    ]);
    if (inventoryResult.error) fail(inventoryResult.error, 'Stock movements could not be loaded.');
    if (orderResult.error) fail(orderResult.error, 'Order status logs could not be loaded.');
    if (auditResult.error) fail(auditResult.error, 'Admin audit logs could not be loaded.');
    return {
      inventory: (inventoryResult.data || []) as InventoryMovement[],
      orders: (orderResult.data || []) as OrderStatusHistory[],
      audit: (auditResult.data || []) as AdminAuditEntry[],
    };
  },

  async getContactMessages(): Promise<ContactMessage[]> {
    const { data, error } = await client().from('contact_messages').select('*').order('created_at', { ascending: false });
    if (error) fail(error, 'Customer messages could not be loaded.');
    return (data || []) as ContactMessage[];
  },

  async updateContactMessage(id: string, status: ContactMessage['status'], internalNote: string): Promise<ContactMessage> {
    const { data: auth, error: authError } = await client().auth.getUser();
    if (authError || !auth.user) fail(authError, 'Sign in again to update customer messages.');
    const { data, error } = await client().from('contact_messages').update({
      status, internal_note: internalNote.trim() || null,
      assigned_to: status === 'new' ? null : auth.user!.id, updated_at: new Date().toISOString(),
    }).eq('id', id).select('*').single();
    if (error || !data) fail(error, 'Customer message could not be updated.');
    return data as ContactMessage;
  },

  async getUsers(): Promise<Profile[]> {
    const { data, error } = await client().from('profiles').select('*').order('created_at', { ascending: false });
    if (error) fail(error, 'Users could not be loaded.');
    return (data || []) as Profile[];
  },

  async updateUserRole(userId: string, newRole: UserRole): Promise<Profile> {
    const { data, error } = await client().rpc('admin_set_user_role', { p_user_id: userId, p_role: newRole });
    if (error || !data) fail(error, 'User role could not be updated.');
    return data as Profile;
  },

  async deleteUser(userId: string): Promise<void> {
    const { error } = await client().rpc('admin_delete_user', { p_user_id: userId });
    if (error) fail(error, 'User could not be deleted.');
  },

};
