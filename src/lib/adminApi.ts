import { isSupabaseConfigured, supabase } from './supabase';
import { Category, FinancialStats, FulfilmentStatus, Genre, Order, OrderStatus, Product, Promotion, StoreSettings } from '../types';

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
  constructor(message: string, public readonly code = 'ADMIN_BACKEND_ERROR') {
    super(message);
    this.name = 'AdminBackendError';
  }
}

function client() {
  if (!isSupabaseConfigured || !supabase) {
    throw new AdminBackendError(
      'Backend operasional belum terhubung. Konfigurasikan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY sebelum menggunakan admin.',
      'BACKEND_NOT_CONFIGURED'
    );
  }
  return supabase;
}

function fail(error: { message: string; code?: string } | null, fallback: string): never {
  throw new AdminBackendError(error?.message || fallback, error?.code || 'QUERY_FAILED');
}

function normalizeOrder(row: any): Order {
  return {
    ...row,
    subtotal: Number(row.subtotal),
    shipping_amount: Number(row.shipping_amount),
    discount_amount: Number(row.discount_amount),
    total_amount: Number(row.total_amount),
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

  async getProducts(): Promise<Product[]> {
    const { data, error } = await client()
      .from('products')
      .select('*, category:categories(*), product_genres(genre:genres(*))')
      .order('created_at', { ascending: false });
    if (error) fail(error, 'Produk tidak dapat dimuat.');
    return (data || []).map((row: any) => ({
      ...row,
      price: Number(row.price),
      compare_at_price: row.compare_at_price == null ? null : Number(row.compare_at_price),
      genres: (row.product_genres || []).map((link: any) => link.genre).filter(Boolean),
    })) as Product[];
  },

  async getCategories(): Promise<Category[]> {
    const { data, error } = await client()
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) fail(error, 'Kategori tidak dapat dimuat.');
    return (data || []) as Category[];
  },

  async createCategory(input: Omit<Category, 'id'>): Promise<Category> {
    const { data, error } = await client().from('categories').insert(input).select('*').single();
    if (error) fail(error, 'Kategori tidak dapat dibuat.');
    return data as Category;
  },

  async updateCategory(id: string, input: Partial<Category>): Promise<Category> {
    const { data, error } = await client().from('categories').update(input).eq('id', id).select('*').single();
    if (error) fail(error, 'Kategori tidak dapat diperbarui.');
    return data as Category;
  },

  async getGenres(): Promise<Genre[]> {
    const { data, error } = await client().from('genres').select('*').order('name');
    if (error) fail(error, 'Genre tidak dapat dimuat.');
    return (data || []) as Genre[];
  },

  async createGenre(input: Omit<Genre, 'id'>): Promise<Genre> {
    const { data, error } = await client().from('genres').insert(input).select('*').single();
    if (error) fail(error, 'Genre tidak dapat dibuat.');
    return data as Genre;
  },

  async createProduct(input: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category' | 'genres'>): Promise<Product> {
    const { data, error } = await client().from('products').insert(input).select('*').single();
    if (error) fail(error, 'Produk tidak dapat dibuat.');
    return data as Product;
  },

  async updateProduct(id: string, input: Partial<Product>): Promise<Product> {
    const { category: _category, genres: _genres, ...safeInput } = input;
    const { data, error } = await client()
      .from('products')
      .update({ ...safeInput, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) fail(error, 'Produk tidak dapat diperbarui.');
    return data as Product;
  },

  async setProductGenres(productId: string, genreIds: string[]): Promise<void> {
    const { error } = await client().rpc('set_product_genres', { p_product_id: productId, p_genre_ids: genreIds });
    if (error) fail(error, 'Genre produk tidak dapat diperbarui.');
  },

  async archiveProduct(id: string): Promise<void> {
    const { error } = await client()
      .from('products')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) fail(error, 'Produk tidak dapat diarsipkan.');
  },

  async getOrders(): Promise<Order[]> {
    const { data, error } = await client()
      .from('orders')
      .select('*, items:order_items(*)')
      .order('created_at', { ascending: false });
    if (error) fail(error, 'Pesanan tidak dapat dimuat.');
    return (data || []).map(normalizeOrder);
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    fulfilmentStatus: FulfilmentStatus,
    details?: { carrier?: string; trackingNumber?: string; note?: string }
  ): Promise<Order> {
    const { error } = await client().rpc('transition_order_status', {
      p_order_id: orderId,
      p_status: status,
      p_fulfilment_status: fulfilmentStatus,
      p_carrier: details?.carrier || null,
      p_tracking_number: details?.trackingNumber || null,
      p_note: details?.note || null,
    });
    if (error) fail(error, 'Status pesanan tidak dapat diperbarui.');

    const { data, error: readError } = await client()
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', orderId)
      .single();
    if (readError) fail(readError, 'Pesanan terbaru tidak dapat dimuat.');
    return normalizeOrder(data);
  },

  async adjustStock(productId: string, delta: number, reason: string): Promise<Product> {
    const { data, error } = await client().rpc('adjust_product_stock', {
      p_product_id: productId,
      p_delta: delta,
      p_reason: reason,
    });
    if (error) fail(error, 'Stok tidak dapat diperbarui.');
    const row = Array.isArray(data) ? data[0] : data;
    return row as Product;
  },

  async getPromotions(): Promise<Promotion[]> {
    const { data, error } = await client()
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) fail(error, 'Promosi tidak dapat dimuat.');
    return (data || []).map((row) => ({
      ...row,
      value: Number(row.value),
      minimum_order: Number(row.minimum_order),
    })) as Promotion[];
  },

  async createPromotion(input: Omit<Promotion, 'id'>): Promise<Promotion> {
    const { data, error } = await client().from('promotions').insert(input).select('*').single();
    if (error) fail(error, 'Promosi tidak dapat dibuat.');
    return data as Promotion;
  },

  async updatePromotion(id: string, input: Partial<Promotion>): Promise<Promotion> {
    const { data, error } = await client().from('promotions').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
    if (error) fail(error, 'Promosi tidak dapat diperbarui.');
    return data as Promotion;
  },

  async getStoreSettings(): Promise<StoreSettings | null> {
    const { data, error } = await client().from('store_settings').select('*').limit(1).maybeSingle();
    if (error) fail(error, 'Store settings could not be loaded.');
    return data ? ({
      ...data,
      deal_discount_price: Number(data.deal_discount_price),
      free_shipping_threshold: Number(data.free_shipping_threshold),
      standard_shipping_fee: Number(data.standard_shipping_fee),
      express_shipping_fee: Number(data.express_shipping_fee),
      low_stock_threshold: Number(data.low_stock_threshold),
      budget_collection_threshold: Number(data.budget_collection_threshold),
      vip_promo_discount: Number(data.vip_promo_discount),
      vip_min_spend: Number(data.vip_min_spend),
    } as StoreSettings) : null;
  },

  async saveStoreSettings(input: StoreSettings): Promise<StoreSettings> {
    const payload = { ...input, singleton: true, updated_at: new Date().toISOString() };
    const { data, error } = await client().from('store_settings').upsert(payload).select('*').single();
    if (error) fail(error, 'Store settings could not be saved.');
    return {
      ...data,
      deal_discount_price: Number(data.deal_discount_price),
      free_shipping_threshold: Number(data.free_shipping_threshold),
      standard_shipping_fee: Number(data.standard_shipping_fee),
      express_shipping_fee: Number(data.express_shipping_fee),
      low_stock_threshold: Number(data.low_stock_threshold),
      budget_collection_threshold: Number(data.budget_collection_threshold),
      vip_promo_discount: Number(data.vip_promo_discount),
      vip_min_spend: Number(data.vip_min_spend),
    } as StoreSettings;
  },

  async getFinancialStats(): Promise<FinancialStats> {
    const [orders, products, settings] = await Promise.all([this.getOrders(), this.getProducts(), this.getStoreSettings()]);
    if (!settings) throw new AdminBackendError('Konfigurasikan store settings sebelum menggunakan dashboard operasional.', 'SETTINGS_NOT_CONFIGURED');
    const today = new Date().toISOString().slice(0, 10);
    const paidOrders = orders.filter((order) => order.payment_status === 'paid');
    const totalRevenue = paidOrders.reduce((sum, order) => sum + order.total_amount, 0);
    const todayPaid = paidOrders.filter((order) => order.created_at.slice(0, 10) === today);
    const buckets = new Map<string, { amount: number; orders: number }>();

    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      buckets.set(date.toISOString().slice(0, 10), { amount: 0, orders: 0 });
    }
    paidOrders.forEach((order) => {
      const key = order.created_at.slice(0, 10);
      const bucket = buckets.get(key);
      if (bucket) buckets.set(key, { amount: bucket.amount + order.total_amount, orders: bucket.orders + 1 });
    });

    return {
      totalRevenue,
      todayRevenue: todayPaid.reduce((sum, order) => sum + order.total_amount, 0),
      totalOrders: orders.length,
      todayOrders: orders.filter((order) => order.created_at.slice(0, 10) === today).length,
      averageOrderValue: paidOrders.length ? totalRevenue / paidOrders.length : 0,
      lowStockCount: products.filter((product) => product.stock_quantity <= settings.low_stock_threshold && product.status === 'active').length,
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
    if (inventoryResult.error) fail(inventoryResult.error, 'Riwayat pergerakan stok tidak dapat dimuat.');
    if (orderResult.error) fail(orderResult.error, 'Riwayat status pesanan tidak dapat dimuat.');
    if (auditResult.error) fail(auditResult.error, 'Audit admin tidak dapat dimuat.');
    return {
      inventory: (inventoryResult.data || []) as InventoryMovement[],
      orders: (orderResult.data || []) as OrderStatusHistory[],
      audit: (auditResult.data || []) as AdminAuditEntry[],
    };
  },

  async getContactMessages(): Promise<ContactMessage[]> {
    const { data, error } = await client().from('contact_messages').select('*').order('created_at', { ascending: false }).limit(250);
    if (error) fail(error, 'Pesan pelanggan tidak dapat dimuat.');
    return (data || []) as ContactMessage[];
  },

  async updateContactMessage(id: string, status: ContactMessage['status'], internalNote: string): Promise<ContactMessage> {
    const { data: auth } = await client().auth.getUser();
    const { data, error } = await client().from('contact_messages').update({
      status,
      internal_note: internalNote.trim() || null,
      assigned_to: status === 'new' ? null : auth.user?.id || null,
      updated_at: new Date().toISOString(),
    }).eq('id', id).select('*').single();
    if (error) fail(error, 'Pesan pelanggan tidak dapat diperbarui.');
    return data as ContactMessage;
  },
};
