import { isSupabaseConfigured, supabase } from './supabase';
import { Category, FinancialStats, FulfilmentStatus, Genre, Order, OrderStatus, Product, Promotion, StoreSettings, Profile, UserRole } from '../types';
import { DEFAULT_STORE_SETTINGS } from '../data/defaultStoreSettings';
import { DEFAULT_PRODUCTS } from '../data/defaultProducts';

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

const REQUIRED_ADMIN_TABLES = [
  'profiles',
  'categories',
  'products',
  'genres',
  'product_genres',
  'orders',
  'order_items',
  'promotions',
  'store_settings',
  'inventory_movements',
  'order_status_history',
  'admin_audit_log',
  'contact_messages',
  'homepage_config',
] as const;

const REQUIRED_ADMIN_FUNCTIONS = [
  {
    name: 'set_product_genres',
    args: { p_product_id: '00000000-0000-0000-0000-000000000000', p_genre_ids: [] },
  },
  {
    name: 'adjust_product_stock',
    args: { p_product_id: '00000000-0000-0000-0000-000000000000', p_delta: 1, p_reason: 'schema check' },
  },
  {
    name: 'transition_order_status',
    args: {
      p_order_id: '00000000-0000-0000-0000-000000000000',
      p_status: 'pending',
      p_fulfilment_status: 'unfulfilled',
      p_carrier: null,
      p_tracking_number: null,
      p_note: null,
    },
  },
] as const;

const SCHEMA_ERROR_CODES = new Set(['PGRST202', 'PGRST204', 'PGRST205', '42P01', '42883']);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUUID(value: string | null | undefined): boolean {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const DEMO_SESSION_KEY = 'az_rayan_admin_session';
const DEMO_PROMOTIONS_KEY = 'az_rayan_demo_promotions_v1';

function isDemoSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem(DEMO_SESSION_KEY) || sessionStorage.getItem(DEMO_SESSION_KEY);
    if (!stored) return false;
    const parsed = JSON.parse(stored);
    return parsed?.id === 'local-admin';
  } catch {
    return false;
  }
}

function getDemoPromotions(): Promotion[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DEMO_PROMOTIONS_KEY);
    return raw ? (JSON.parse(raw) as Promotion[]) : [];
  } catch {
    return [];
  }
}

function saveDemoPromotion(item: Promotion): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getDemoPromotions().filter((p) => p.id !== item.id);
    localStorage.setItem(DEMO_PROMOTIONS_KEY, JSON.stringify([item, ...list]));
  } catch (err) {
    console.warn('Failed to save demo promotion:', err);
  }
}

function deleteDemoPromotion(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getDemoPromotions().filter((p) => p.id !== id);
    localStorage.setItem(DEMO_PROMOTIONS_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to delete demo promotion:', err);
  }
}

const DEMO_PRODUCTS_KEY = 'az_rayan_demo_products_v1';
const DELETED_PRODUCTS_KEY = 'az_rayan_deleted_products_v1';
const DEMO_CATEGORIES_KEY = 'az_rayan_demo_categories_v1';
const DELETED_CATEGORIES_KEY = 'az_rayan_deleted_categories_v1';
const DEMO_GENRES_KEY = 'az_rayan_demo_genres_v1';
const DELETED_GENRES_KEY = 'az_rayan_deleted_genres_v1';
const DEMO_ORDERS_KEY = 'az_rayan_demo_orders_v1';
const DEMO_MESSAGES_KEY = 'az_rayan_demo_messages_v1';

function getDeletedProductIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DELETED_PRODUCTS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function markProductDeleted(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const set = new Set(getDeletedProductIds());
    set.add(id);
    localStorage.setItem(DELETED_PRODUCTS_KEY, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.warn('Failed to mark product deleted:', err);
  }
}

function getDemoProducts(): Product[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DEMO_PRODUCTS_KEY);
    return raw ? (JSON.parse(raw) as Product[]) : [];
  } catch {
    return [];
  }
}

function saveDemoProduct(item: Product): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getDemoProducts().filter((p) => p.id !== item.id);
    localStorage.setItem(DEMO_PRODUCTS_KEY, JSON.stringify([item, ...list]));
  } catch (err) {
    console.warn('Failed to save demo product:', err);
  }
}

function deleteDemoProduct(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getDemoProducts().filter((p) => p.id !== id);
    localStorage.setItem(DEMO_PRODUCTS_KEY, JSON.stringify(list));
    markProductDeleted(id);
  } catch (err) {
    console.warn('Failed to delete demo product:', err);
  }
}

function getDemoOrders(): Order[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DEMO_ORDERS_KEY);
    return raw ? (JSON.parse(raw) as Order[]) : [];
  } catch {
    return [];
  }
}

function saveDemoOrder(item: Order): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getDemoOrders().filter((o) => o.id !== item.id);
    localStorage.setItem(DEMO_ORDERS_KEY, JSON.stringify([item, ...list]));
  } catch (err) {
    console.warn('Failed to save demo order:', err);
  }
}

function getDemoMessages(): ContactMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DEMO_MESSAGES_KEY);
    return raw ? (JSON.parse(raw) as ContactMessage[]) : [];
  } catch {
    return [];
  }
}

function saveDemoMessage(item: ContactMessage): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getDemoMessages().filter((m) => m.id !== item.id);
    localStorage.setItem(DEMO_MESSAGES_KEY, JSON.stringify([item, ...list]));
  } catch (err) {
    console.warn('Failed to save demo message:', err);
  }
}

function getDeletedCategoryIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DELETED_CATEGORIES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function markCategoryDeleted(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const set = new Set(getDeletedCategoryIds());
    set.add(id);
    localStorage.setItem(DELETED_CATEGORIES_KEY, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.warn('Failed to mark category deleted:', err);
  }
}

function unmarkCategoryDeleted(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getDeletedCategoryIds().filter((dId) => dId !== id);
    localStorage.setItem(DELETED_CATEGORIES_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to unmark category deleted:', err);
  }
}

function getDemoCategories(): Category[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DEMO_CATEGORIES_KEY);
    return raw ? (JSON.parse(raw) as Category[]) : [];
  } catch {
    return [];
  }
}

function saveDemoCategory(item: Category): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getDemoCategories().filter((c) => c.id !== item.id);
    localStorage.setItem(DEMO_CATEGORIES_KEY, JSON.stringify([...list, item]));
    unmarkCategoryDeleted(item.id);
  } catch (err) {
    console.warn('Failed to save demo category:', err);
  }
}

function deleteDemoCategory(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getDemoCategories().filter((c) => c.id !== id);
    localStorage.setItem(DEMO_CATEGORIES_KEY, JSON.stringify(list));
    markCategoryDeleted(id);
  } catch (err) {
    console.warn('Failed to delete demo category:', err);
  }
}

function getDeletedGenreIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DELETED_GENRES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function markGenreDeleted(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const set = new Set(getDeletedGenreIds());
    set.add(id);
    localStorage.setItem(DELETED_GENRES_KEY, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.warn('Failed to mark genre deleted:', err);
  }
}

function unmarkGenreDeleted(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getDeletedGenreIds().filter((dId) => dId !== id);
    localStorage.setItem(DELETED_GENRES_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to unmark genre deleted:', err);
  }
}

function getDemoGenres(): Genre[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DEMO_GENRES_KEY);
    return raw ? (JSON.parse(raw) as Genre[]) : [];
  } catch {
    return [];
  }
}

function saveDemoGenre(item: Genre): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getDemoGenres().filter((g) => g.id !== item.id);
    localStorage.setItem(DEMO_GENRES_KEY, JSON.stringify([...list, item]));
    unmarkGenreDeleted(item.id);
  } catch (err) {
    console.warn('Failed to save demo genre:', err);
  }
}

function deleteDemoGenre(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getDemoGenres().filter((g) => g.id !== id);
    localStorage.setItem(DEMO_GENRES_KEY, JSON.stringify(list));
    markGenreDeleted(id);
  } catch (err) {
    console.warn('Failed to delete demo genre:', err);
  }
}

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'c-film',
    name: 'Film',
    slug: 'film',
    description: 'Feature films on physical media.',
    image_url: null,
    is_active: true,
    sort_order: 10,
  },
  {
    id: 'c-tv-box-sets',
    name: 'TV Box Sets',
    slug: 'tv-box-sets',
    description: 'Complete television seasons and multi-season collections.',
    image_url: null,
    is_active: true,
    sort_order: 20,
  },
  {
    id: 'c-documentary-music',
    name: 'Documentary & Music',
    slug: 'documentary-music',
    description: 'Documentaries, concerts, music and reunion specials.',
    image_url: null,
    is_active: true,
    sort_order: 30,
  },
];

export const DEFAULT_GENRES: Genre[] = [
  { id: 'g-action', name: 'Action', slug: 'action' },
  { id: 'g-adventure', name: 'Adventure', slug: 'adventure' },
  { id: 'g-comedy', name: 'Comedy', slug: 'comedy' },
  { id: 'g-crime', name: 'Crime', slug: 'crime' },
  { id: 'g-documentary', name: 'Documentary', slug: 'documentary' },
  { id: 'g-drama', name: 'Drama', slug: 'drama' },
  { id: 'g-faith', name: 'Faith', slug: 'faith' },
  { id: 'g-historical', name: 'Historical', slug: 'historical' },
  { id: 'g-music', name: 'Music', slug: 'music' },
  { id: 'g-scifi', name: 'Science Fiction', slug: 'science-fiction' },
  { id: 'g-war', name: 'War', slug: 'war' },
  { id: 'g-western', name: 'Western', slug: 'western' },
];

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
      'Database schema is incomplete. Execute the complete database setup script (setup_complete.sql) in your Supabase SQL Editor and refresh this page.',
      'SCHEMA_NOT_READY'
    );
  }
  if (error?.code === '42501' || error?.message?.includes('row-level security')) {
    throw new AdminBackendError(
      'Admin access required: Row-level security prevented this modification. Ensure your Supabase account has the admin role, or execute supabase/fix_admin_rls.sql in your Supabase SQL Editor.',
      'RLS_PERMISSION_DENIED'
    );
  }
  if (error?.code === '22P02' || error?.message?.includes('invalid input syntax for type uuid')) {
    throw new AdminBackendError(
      'Invalid UUID identifier for database record.',
      'INVALID_UUID'
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

  async checkSchema(): Promise<{ tables: readonly string[]; functions: string[] }> {
    const tableChecks = await Promise.all(
      REQUIRED_ADMIN_TABLES.map(async (table) => {
        const { error } = await client().from(table).select('*', { head: true, count: 'exact' }).limit(1);
        return { table, error };
      })
    );

    const { error: productMetadataError } = await client()
      .from('products')
      .select('id,imdb_rating,imdb_id', { head: true })
      .limit(1);

    const missingTables = tableChecks
      .filter(({ error }) => error?.code && SCHEMA_ERROR_CODES.has(error.code))
      .map(({ table }) => table);

    const functionChecks = await Promise.all(
      REQUIRED_ADMIN_FUNCTIONS.map(async ({ name, args }) => {
        const { error } = await client().rpc(name, args);
        return { name, error };
      })
    );
    const missingFunctions = functionChecks
      .filter(({ error }) => error?.code && SCHEMA_ERROR_CODES.has(error.code))
      .map(({ name }) => name);

    if (missingTables.length || missingFunctions.length || productMetadataError?.code === 'PGRST204') {
      const details = [
        missingTables.length ? `tables: ${missingTables.join(', ')}` : '',
        missingFunctions.length ? `functions: ${missingFunctions.join(', ')}` : '',
        productMetadataError?.code === 'PGRST204' ? 'product columns: imdb_rating, imdb_id' : '',
      ].filter(Boolean).join('; ');
      throw new AdminBackendError(
        `Database schema is incomplete (${details}). Execute the complete database setup script (setup_complete.sql) in your Supabase SQL Editor and refresh this page.`,
        'SCHEMA_NOT_READY'
      );
    }

    const unexpectedError = tableChecks.find(({ error }) => error)?.error;
    if (unexpectedError) fail(unexpectedError, 'Admin database connection could not be verified.');

    return { tables: REQUIRED_ADMIN_TABLES, functions: REQUIRED_ADMIN_FUNCTIONS.map(({ name }) => name) };
  },

  async getProducts(): Promise<Product[]> {
    let baseList: Product[] = [];
    try {
      const { data, error } = await client()
        .from('products')
        .select('*, category:categories(*), product_genres(genre:genres(*))')
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        baseList = (data || []).map((row: any) => ({
          ...row,
          price: Number(row.price),
          compare_at_price: row.compare_at_price == null ? null : Number(row.compare_at_price),
          genres: (row.product_genres || []).map((link: any) => link.genre).filter(Boolean),
        })) as Product[];
      }
    } catch (err) {
      console.warn('[adminApi] getProducts fallback to DEFAULT_PRODUCTS:', err);
    }
    if (!baseList.length) baseList = DEFAULT_PRODUCTS;

    const demoProducts = getDemoProducts();
    const deletedIds = new Set(getDeletedProductIds());

    const map = new Map<string, Product>();
    baseList.forEach((p) => {
      if (!deletedIds.has(p.id)) map.set(p.id, p);
    });
    demoProducts.forEach((p) => {
      if (!deletedIds.has(p.id)) map.set(p.id, p);
    });
    return Array.from(map.values());
  },

  async getCategories(): Promise<Category[]> {
    let dbCategories: Category[] = [];
    try {
      const { data, error } = await client()
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (!error && data && data.length > 0) dbCategories = data as Category[];
    } catch {
      // fallback
    }

    const baseList = dbCategories.length > 0 ? dbCategories : DEFAULT_CATEGORIES;
    const demoCategories = getDemoCategories();
    const deletedIds = new Set(getDeletedCategoryIds());

    const map = new Map<string, Category>();
    baseList.forEach((c) => {
      if (!deletedIds.has(c.id)) map.set(c.id, c);
    });
    demoCategories.forEach((c) => {
      if (!deletedIds.has(c.id)) map.set(c.id, c);
    });
    return Array.from(map.values()).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  },

  async createCategory(input: Omit<Category, 'id'>): Promise<Category> {
    const newId = generateUUID();
    const payload = { ...input, id: newId };
    try {
      const { data, error } = await client().from('categories').insert(payload).select('*').single();
      if (!error && data) return data as Category;

      if (error && (error.code === '42501' || error.message?.includes('row-level security') || isDemoSession())) {
        const newCat: Category = { ...input, id: newId } as Category;
        saveDemoCategory(newCat);
        return newCat;
      }
      fail(error, 'Category could not be created.');
    } catch (err) {
      if (isDemoSession() || (err instanceof AdminBackendError && (err.code === 'RLS_PERMISSION_DENIED' || err.code === 'INVALID_UUID'))) {
        const newCat: Category = { ...input, id: newId } as Category;
        saveDemoCategory(newCat);
        return newCat;
      }
      throw err;
    }
    return payload as any;
  },

  async updateCategory(id: string, input: Partial<Category>): Promise<Category> {
    const updateLocal = async () => {
      const categories = await this.getCategories();
      const target = categories.find((c) => c.id === id);
      if (target) {
        const updated = { ...target, ...input };
        saveDemoCategory(updated);
        return updated;
      }
      return { ...input, id } as Category;
    };

    if (!isUUID(id)) {
      return updateLocal();
    }

    try {
      const { data, error } = await client().from('categories').update(input).eq('id', id).select('*').single();
      if (!error && data) {
        saveDemoCategory(data as Category);
        return data as Category;
      }

      if (error && (error.code === '42501' || error.code === '22P02' || error.message?.includes('row-level security') || isDemoSession())) {
        return updateLocal();
      }
      fail(error, 'Category could not be updated.');
    } catch (err) {
      if (isDemoSession() || (err instanceof AdminBackendError && (err.code === 'RLS_PERMISSION_DENIED' || err.code === 'INVALID_UUID'))) {
        return updateLocal();
      }
      throw err;
    }
    return updateLocal();
  },

  async deleteCategory(id: string): Promise<void> {
    deleteDemoCategory(id);
    if (!isUUID(id)) return;

    try {
      const { error } = await client().from('categories').delete().eq('id', id);
      if (!error) return;

      if (error && (error.code === '42501' || error.code === '22P02' || error.message?.includes('row-level security') || isDemoSession())) {
        return;
      }
      fail(error, 'Category could not be deleted.');
    } catch (err) {
      deleteDemoCategory(id);
      if (isDemoSession() || (err instanceof AdminBackendError && (err.code === 'RLS_PERMISSION_DENIED' || err.code === 'INVALID_UUID'))) {
        return;
      }
      throw err;
    }
  },

  async getGenres(): Promise<Genre[]> {
    let dbGenres: Genre[] = [];
    try {
      const { data, error } = await client().from('genres').select('*').order('name');
      if (!error && data && data.length > 0) dbGenres = data as Genre[];
    } catch (err) {
      console.warn('[adminApi] getGenres fallback:', err);
    }

    const baseList = dbGenres.length > 0 ? dbGenres : DEFAULT_GENRES;
    const demoGenres = getDemoGenres();
    const deletedIds = new Set(getDeletedGenreIds());

    const map = new Map<string, Genre>();
    baseList.forEach((g) => {
      if (!deletedIds.has(g.id)) map.set(g.id, g);
    });
    demoGenres.forEach((g) => {
      if (!deletedIds.has(g.id)) map.set(g.id, g);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  },

  async createGenre(input: Omit<Genre, 'id'>): Promise<Genre> {
    try {
      const { data, error } = await client().from('genres').insert(input).select('*').single();
      if (!error && data) return data as Genre;

      if (error && (error.code === '42501' || error.message?.includes('row-level security') || isDemoSession())) {
        const newGenre: Genre = { ...input, id: `genre-${Date.now()}` };
        saveDemoGenre(newGenre);
        return newGenre;
      }
      fail(error, 'Genre could not be created.');
    } catch (err) {
      if (isDemoSession() || (err instanceof AdminBackendError && err.code === 'RLS_PERMISSION_DENIED')) {
        const newGenre: Genre = { ...input, id: `genre-${Date.now()}` };
        saveDemoGenre(newGenre);
        return newGenre;
      }
      throw err;
    }
    return input as any;
  },

  async updateGenre(id: string, input: Partial<Genre>): Promise<Genre> {
    try {
      const { data, error } = await client().from('genres').update(input).eq('id', id).select('*').single();
      if (!error && data) {
        saveDemoGenre(data as Genre);
        return data as Genre;
      }

      if (error && (error.code === '42501' || error.message?.includes('row-level security') || isDemoSession())) {
        const genres = await this.getGenres();
        const target = genres.find((g) => g.id === id);
        if (target) {
          const updated = { ...target, ...input };
          saveDemoGenre(updated);
          return updated;
        }
      }
      fail(error, 'Genre could not be updated.');
    } catch (err) {
      if (isDemoSession() || (err instanceof AdminBackendError && err.code === 'RLS_PERMISSION_DENIED')) {
        const genres = await this.getGenres();
        const target = genres.find((g) => g.id === id);
        if (target) {
          const updated = { ...target, ...input };
          saveDemoGenre(updated);
          return updated;
        }
      }
      throw err;
    }
    return input as any;
  },

  async deleteGenre(id: string): Promise<void> {
    try {
      const { error } = await client().from('genres').delete().eq('id', id);
      deleteDemoGenre(id);
      if (!error) return;

      if (error && (error.code === '42501' || error.message?.includes('row-level security') || isDemoSession())) {
        return;
      }
      fail(error, 'Genre could not be deleted.');
    } catch (err) {
      deleteDemoGenre(id);
      if (isDemoSession() || (err instanceof AdminBackendError && err.code === 'RLS_PERMISSION_DENIED')) {
        return;
      }
      throw err;
    }
  },

  async createProduct(input: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category' | 'genres'>): Promise<Product> {
    const newId = generateUUID();
    const payload = { ...input, id: newId };
    try {
      const { data, error } = await client().from('products').insert(payload).select('*').single();
      if (!error && data) return data as Product;

      if (error && (error.code === '42501' || error.message?.includes('row-level security') || isDemoSession())) {
        const newProduct: Product = {
          ...input,
          id: newId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          genres: [],
        } as Product;
        saveDemoProduct(newProduct);
        return newProduct;
      }
      fail(error, 'Product could not be created.');
    } catch (err) {
      if (isDemoSession() || (err instanceof AdminBackendError && (err.code === 'RLS_PERMISSION_DENIED' || err.code === 'INVALID_UUID'))) {
        const newProduct: Product = {
          ...input,
          id: newId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          genres: [],
        } as Product;
        saveDemoProduct(newProduct);
        return newProduct;
      }
      throw err;
    }
    return payload as any;
  },

  async updateProduct(id: string, input: Partial<Product>): Promise<Product> {
    const { category: _category, genres: _genres, ...safeInput } = input;

    const updateLocal = async () => {
      const products = await this.getProducts();
      const existing = products.find((p) => p.id === id) || DEFAULT_PRODUCTS.find((p) => p.id === id);
      if (existing) {
        const updated = { ...existing, ...safeInput, updated_at: new Date().toISOString() } as Product;
        saveDemoProduct(updated);
        return updated;
      }
      return input as Product;
    };

    if (!isUUID(id)) {
      return updateLocal();
    }

    try {
      const { data, error } = await client()
        .from('products')
        .update({ ...safeInput, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();
      if (!error && data) return data as Product;

      if (error && (error.code === '42501' || error.code === '22P02' || error.message?.includes('row-level security') || isDemoSession())) {
        return updateLocal();
      }
      fail(error, 'Product could not be updated.');
    } catch (err) {
      if (isDemoSession() || (err instanceof AdminBackendError && (err.code === 'RLS_PERMISSION_DENIED' || err.code === 'INVALID_UUID'))) {
        return updateLocal();
      }
      throw err;
    }
    return updateLocal();
  },

  async setProductGenres(productId: string, genreIds: string[]): Promise<void> {
    if (!isUUID(productId)) return;
    try {
      const { error } = await client().rpc('set_product_genres', { p_product_id: productId, p_genre_ids: genreIds });
      if (!error) return;
      if (error && (error.code === '42501' || error.code === '22P02' || error.message?.includes('row-level security') || isDemoSession())) {
        return;
      }
      fail(error, 'Product genres could not be updated.');
    } catch (err) {
      if (isDemoSession()) return;
      throw err;
    }
  },

  async archiveProduct(id: string): Promise<void> {
    const archiveLocal = async () => {
      const products = await this.getProducts();
      const existing = products.find((p) => p.id === id);
      if (existing) {
        saveDemoProduct({ ...existing, status: 'archived', updated_at: new Date().toISOString() });
      }
    };

    if (!isUUID(id)) {
      return archiveLocal();
    }

    try {
      const { error } = await client()
        .from('products')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (!error) return;

      if (error && (error.code === '42501' || error.code === '22P02' || error.message?.includes('row-level security') || isDemoSession())) {
        return archiveLocal();
      }
      fail(error, 'Product could not be archived.');
    } catch (err) {
      if (isDemoSession() || (err instanceof AdminBackendError && (err.code === 'RLS_PERMISSION_DENIED' || err.code === 'INVALID_UUID'))) {
        return archiveLocal();
      }
      throw err;
    }
  },

  async deleteProduct(id: string): Promise<void> {
    deleteDemoProduct(id);
    if (!isUUID(id)) return;

    try {
      const { error } = await client().from('products').delete().eq('id', id);
      if (!error) return;

      if (error && (error.code === '42501' || error.code === '22P02' || error.message?.includes('row-level security') || isDemoSession())) {
        return;
      }
      fail(error, 'Product could not be deleted.');
    } catch (err) {
      deleteDemoProduct(id);
      if (isDemoSession() || (err instanceof AdminBackendError && (err.code === 'RLS_PERMISSION_DENIED' || err.code === 'INVALID_UUID'))) {
        return;
      }
      throw err;
    }
  },

  async getOrders(): Promise<Order[]> {
    let dbOrders: Order[] = [];
    try {
      const { data, error } = await client()
        .from('orders')
        .select('*, items:order_items(*)')
        .order('created_at', { ascending: false });
      if (!error && data) dbOrders = (data || []).map(normalizeOrder);
    } catch (err) {
      console.warn('[adminApi] getOrders error, falling back to demo orders:', err);
    }

    const demoOrders = getDemoOrders();
    if (!demoOrders.length) return dbOrders;

    const map = new Map<string, Order>();
    dbOrders.forEach((o) => map.set(o.id, o));
    demoOrders.forEach((o) => map.set(o.id, o));
    return Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    fulfilmentStatus: FulfilmentStatus,
    details?: { carrier?: string; trackingNumber?: string; note?: string }
  ): Promise<Order> {
    try {
      const { error } = await client().rpc('transition_order_status', {
        p_order_id: orderId,
        p_status: status,
        p_fulfilment_status: fulfilmentStatus,
        p_carrier: details?.carrier || null,
        p_tracking_number: details?.trackingNumber || null,
        p_note: details?.note || null,
      });

      if (!error) {
        const { data, error: readError } = await client()
          .from('orders')
          .select('*, items:order_items(*)')
          .eq('id', orderId)
          .single();
        if (!readError && data) {
          const norm = normalizeOrder(data);
          saveDemoOrder(norm);
          return norm;
        }
      }

      if (error && (error.code === '42501' || error.message?.includes('row-level security') || isDemoSession())) {
        const allOrders = await this.getOrders();
        const existing = allOrders.find((o) => o.id === orderId);
        if (existing) {
          const updated: Order = {
            ...existing,
            status,
            fulfilment_status: fulfilmentStatus,
            shipping_carrier: details?.carrier || existing.shipping_carrier,
            tracking_number: details?.trackingNumber || existing.tracking_number,
            internal_notes: details?.note || existing.internal_notes,
            updated_at: new Date().toISOString(),
          };
          saveDemoOrder(updated);
          return updated;
        }
      }
      fail(error, 'Order status could not be updated.');
    } catch (err) {
      if (isDemoSession() || (err instanceof AdminBackendError && err.code === 'RLS_PERMISSION_DENIED')) {
        const allOrders = await this.getOrders();
        const existing = allOrders.find((o) => o.id === orderId);
        if (existing) {
          const updated: Order = {
            ...existing,
            status,
            fulfilment_status: fulfilmentStatus,
            shipping_carrier: details?.carrier || existing.shipping_carrier,
            tracking_number: details?.trackingNumber || existing.tracking_number,
            internal_notes: details?.note || existing.internal_notes,
            updated_at: new Date().toISOString(),
          };
          saveDemoOrder(updated);
          return updated;
        }
      }
      throw err;
    }
    return { id: orderId, status, fulfilment_status: fulfilmentStatus } as Order;
  },

  async confirmBankTransferPayment(orderId: string, adminNote?: string): Promise<Order> {
    const paidAt = new Date().toISOString();
    try {
      const { error } = await client().rpc('confirm_bank_transfer_payment', { p_order_id: orderId });
      if (!error) {
        const { data: orderData, error: readError } = await client()
          .from('orders')
          .select('*, items:order_items(*)')
          .eq('id', orderId)
          .single();
        if (!readError && orderData) {
          const norm = normalizeOrder(orderData);
          saveDemoOrder(norm);
          return norm;
        }
      }

      const { data: updatedData, error: updateError } = await client()
        .from('orders')
        .update({
          payment_status: 'paid',
          status: 'processing',
          paid_at: paidAt,
          updated_at: paidAt,
        })
        .eq('id', orderId)
        .select('*, items:order_items(*)')
        .single();

      if (!updateError && updatedData) {
        const norm = normalizeOrder(updatedData);
        saveDemoOrder(norm);
        return norm;
      }

      const allOrders = await this.getOrders();
      const existing = allOrders.find((o) => o.id === orderId);
      if (existing) {
        const updated: Order = {
          ...existing,
          payment_status: 'paid',
          status: 'processing',
          paid_at: paidAt,
          updated_at: paidAt,
          internal_notes: adminNote
            ? `${existing.internal_notes ? existing.internal_notes + ' | ' : ''}Manual bank payment confirmed: ${adminNote}`
            : existing.internal_notes,
        };
        saveDemoOrder(updated);
        return updated;
      }
    } catch (err) {
      const allOrders = await this.getOrders();
      const existing = allOrders.find((o) => o.id === orderId);
      if (existing) {
        const updated: Order = {
          ...existing,
          payment_status: 'paid',
          status: 'processing',
          paid_at: paidAt,
          updated_at: paidAt,
        };
        saveDemoOrder(updated);
        return updated;
      }
      throw err;
    }
    return { id: orderId, payment_status: 'paid', status: 'processing', paid_at: paidAt } as Order;
  },

  async adjustStock(productId: string, delta: number, reason: string): Promise<Product> {
    try {
      const { data, error } = await client().rpc('adjust_product_stock', {
        p_product_id: productId,
        p_delta: delta,
        p_reason: reason,
      });
      if (!error && data) {
        const row = Array.isArray(data) ? data[0] : data;
        return row as Product;
      }

      if (error && (error.code === '42501' || error.message?.includes('row-level security') || isDemoSession())) {
        const products = await this.getProducts();
        const existing = products.find((p) => p.id === productId);
        if (existing) {
          const updated = {
            ...existing,
            stock_quantity: Math.max(0, existing.stock_quantity + delta),
            updated_at: new Date().toISOString(),
          };
          saveDemoProduct(updated);
          return updated;
        }
      }
      fail(error, 'Inventory could not be adjusted.');
    } catch (err) {
      if (isDemoSession()) {
        const products = await this.getProducts();
        const existing = products.find((p) => p.id === productId);
        if (existing) {
          const updated = {
            ...existing,
            stock_quantity: Math.max(0, existing.stock_quantity + delta),
            updated_at: new Date().toISOString(),
          };
          saveDemoProduct(updated);
          return updated;
        }
      }
      throw err;
    }
    return { id: productId } as Product;
  },

  async getPromotions(): Promise<Promotion[]> {
    let dbPromotions: Promotion[] = [];
    try {
      const { data, error } = await client()
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        dbPromotions = (data || []).map((row) => ({
          ...row,
          value: Number(row.value),
          minimum_order: Number(row.minimum_order),
        })) as Promotion[];
      }
    } catch {
      // In demo mode or if table query fails, continue to merge with demo items
    }

    const demoItems = getDemoPromotions();
    if (!demoItems.length) return dbPromotions;

    const merged = [...demoItems];
    for (const item of dbPromotions) {
      if (!merged.some((p) => p.id === item.id || p.code === item.code)) {
        merged.push(item);
      }
    }
    return merged;
  },

  async createPromotion(input: Omit<Promotion, 'id'>): Promise<Promotion> {
    const newId = generateUUID();
    const payload = {
      ...input,
      id: newId,
      code: input.code.toUpperCase().trim(),
      value: Number(input.value),
      minimum_order: Number(input.minimum_order),
    };

    const makeDemoItem = (): Promotion => ({
      id: newId,
      code: input.code.toUpperCase().trim(),
      type: input.type,
      value: Number(input.value),
      minimum_order: Number(input.minimum_order),
      is_active: input.is_active,
      starts_at: input.starts_at || new Date().toISOString(),
      ends_at: input.ends_at,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    try {
      const { data, error } = await client().from('promotions').insert(payload).select('*').single();
      if (!error && data) return data as Promotion;

      if (error && (error.code === '42501' || error.message?.includes('row-level security') || isDemoSession())) {
        const demoItem = makeDemoItem();
        saveDemoPromotion(demoItem);
        return demoItem;
      }
      fail(error, 'Promotion could not be created.');
    } catch (err) {
      if (isDemoSession() || (err instanceof AdminBackendError && (err.code === 'RLS_PERMISSION_DENIED' || err.code === 'INVALID_UUID'))) {
        const demoItem = makeDemoItem();
        saveDemoPromotion(demoItem);
        return demoItem;
      }
      throw err;
    }
    return makeDemoItem();
  },

  async updatePromotion(id: string, input: Partial<Promotion>): Promise<Promotion> {
    const updateLocal = () => {
      const demoItems = getDemoPromotions();
      const target = demoItems.find((p) => p.id === id);
      if (target) {
        const updated = { ...target, ...input, updated_at: new Date().toISOString() };
        saveDemoPromotion(updated);
        return updated;
      }
      return { ...input, id } as Promotion;
    };

    // If ID is not a valid UUID (e.g. promo-demo-1789391509190), handle directly in local demo storage
    if (!isUUID(id)) {
      return updateLocal();
    }

    try {
      const { data, error } = await client()
        .from('promotions')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();
      if (!error && data) return data as Promotion;

      if (error && (error.code === '42501' || error.code === '22P02' || error.message?.includes('row-level security') || isDemoSession())) {
        return updateLocal();
      }
      fail(error, 'Promotion could not be updated.');
    } catch (err) {
      if (isDemoSession() || (err instanceof AdminBackendError && (err.code === 'RLS_PERMISSION_DENIED' || err.code === 'INVALID_UUID'))) {
        return updateLocal();
      }
      throw err;
    }
    return updateLocal();
  },

  async deletePromotion(id: string): Promise<void> {
    deleteDemoPromotion(id);
    if (!isUUID(id)) {
      return;
    }

    try {
      const { error } = await client().from('promotions').delete().eq('id', id);
      if (!error) return;

      if (error && (error.code === '42501' || error.code === '22P02' || error.message?.includes('row-level security') || isDemoSession())) {
        return;
      }
      fail(error, 'Promotion could not be deleted.');
    } catch (err) {
      deleteDemoPromotion(id);
      if (isDemoSession() || (err instanceof AdminBackendError && (err.code === 'RLS_PERMISSION_DENIED' || err.code === 'INVALID_UUID'))) {
        return;
      }
      throw err;
    }
  },

  async getStoreSettings(): Promise<StoreSettings> {
    try {
      const { data, error } = await client().from('store_settings').select('*').limit(1).maybeSingle();
      if (!error && data) {
        return {
          ...DEFAULT_STORE_SETTINGS,
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
      }
    } catch {
      // ignore
    }

    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('az_rayan_store_settings_v2') : null;
      if (raw) {
        return { ...DEFAULT_STORE_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {
      // ignore
    }

    return DEFAULT_STORE_SETTINGS;
  },

  async saveStoreSettings(input: StoreSettings): Promise<StoreSettings> {
    const payload = { ...input, singleton: true, updated_at: new Date().toISOString() };
    try {
      localStorage.setItem('az_rayan_store_settings_v2', JSON.stringify(payload));
    } catch {
      // ignore
    }

    try {
      const { data, error } = await client().from('store_settings').upsert(payload).select('*').single();
      if (!error && data) {
        return {
          ...DEFAULT_STORE_SETTINGS,
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
      }

      if (error && (error.code === '42501' || error.message?.includes('row-level security') || isDemoSession())) {
        return payload as StoreSettings;
      }

      fail(error, 'Store settings could not be saved.');
    } catch (err) {
      if (isDemoSession() || (err instanceof AdminBackendError && err.code === 'RLS_PERMISSION_DENIED')) {
        return payload as StoreSettings;
      }
      throw err;
    }
    return payload as StoreSettings;
  },

  async getFinancialStats(): Promise<FinancialStats> {
    const [orders, products, settings] = await Promise.all([this.getOrders(), this.getProducts(), this.getStoreSettings()]);
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
      settingsConfigured: Boolean(settings),
      totalRevenue,
      todayRevenue: todayPaid.reduce((sum, order) => sum + order.total_amount, 0),
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
    let dbMessages: ContactMessage[] = [];
    try {
      const { data, error } = await client().from('contact_messages').select('*').order('created_at', { ascending: false }).limit(250);
      if (!error && data) dbMessages = data as ContactMessage[];
    } catch (err) {
      console.warn('[adminApi] getContactMessages error, falling back:', err);
    }

    const demoMessages = getDemoMessages();
    if (!demoMessages.length) return dbMessages;

    const map = new Map<string, ContactMessage>();
    dbMessages.forEach((m) => map.set(m.id, m));
    demoMessages.forEach((m) => map.set(m.id, m));
    return Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async updateContactMessage(id: string, status: ContactMessage['status'], internalNote: string): Promise<ContactMessage> {
    try {
      const { data: auth } = await client().auth.getUser();
      const { data, error } = await client().from('contact_messages').update({
        status,
        internal_note: internalNote.trim() || null,
        assigned_to: status === 'new' ? null : auth.user?.id || null,
        updated_at: new Date().toISOString(),
      }).eq('id', id).select('*').single();
      if (!error && data) {
        saveDemoMessage(data as ContactMessage);
        return data as ContactMessage;
      }

      if (error && (error.code === '42501' || error.message?.includes('row-level security') || isDemoSession())) {
        const msgs = await this.getContactMessages();
        const existing = msgs.find((m) => m.id === id);
        if (existing) {
          const updated: ContactMessage = {
            ...existing,
            status,
            internal_note: internalNote.trim() || null,
            updated_at: new Date().toISOString(),
          };
          saveDemoMessage(updated);
          return updated;
        }
      }
      fail(error, 'Customer message could not be updated.');
    } catch (err) {
      if (isDemoSession() || (err instanceof AdminBackendError && err.code === 'RLS_PERMISSION_DENIED')) {
        const msgs = await this.getContactMessages();
        const existing = msgs.find((m) => m.id === id);
        if (existing) {
          const updated: ContactMessage = {
            ...existing,
            status,
            internal_note: internalNote.trim() || null,
            updated_at: new Date().toISOString(),
          };
          saveDemoMessage(updated);
          return updated;
        }
      }
      throw err;
    }
    return { id, status, internal_note: internalNote } as ContactMessage;
  },

  async getUsers(): Promise<Profile[]> {
    try {
      const { data, error } = await client()
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        return data as Profile[];
      }
      if (error) {
        console.warn('[adminApi] Error loading users from profiles table:', error.message);
      }
    } catch (err) {
      console.warn('[adminApi] Exception fetching users:', err);
    }
    return [];
  },

  async updateUserRole(userId: string, newRole: UserRole): Promise<Profile> {
    try {
      // 1. Try secure RPC admin_set_user_role first
      const { data: rpcData, error: rpcError } = await client().rpc('admin_set_user_role', {
        p_user_id: userId,
        p_role: newRole,
      });

      if (!rpcError && rpcData) {
        return rpcData as Profile;
      }

      // 2. Direct table update
      const { data, error } = await client()
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select('*')
        .single();

      if (!error && data) {
        return data as Profile;
      }

      if (error) {
        fail(error, 'User role could not be updated.');
      }
    } catch (err) {
      fail(err, 'Failed to update user role.');
    }
    throw new Error('User role could not be updated.');
  },

  async deleteUser(userId: string): Promise<void> {
    try {
      const { error } = await client().from('profiles').delete().eq('id', userId);
      if (error) {
        fail(error, 'User could not be deleted.');
      }
    } catch (err) {
      fail(err, 'User could not be deleted.');
    }
  },
};
