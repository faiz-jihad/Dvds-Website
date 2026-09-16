import { checkoutApi, CheckoutInput } from './checkoutApi';
import { isSupabaseConfigured, supabase } from './supabase';
import { Address, Category, Genre, Order, Product, Profile, Promotion, StoreSettings } from '../types';
import { DEFAULT_STORE_SETTINGS } from '../data/defaultStoreSettings';
import { DEFAULT_PRODUCTS } from '../data/defaultProducts';
import { DEFAULT_CATEGORIES } from '../data/defaultCategories';
import { DEFAULT_GENRES } from '../data/defaultGenres';

function client() {
  if (!isSupabaseConfigured || !supabase) return null;
  return supabase;
}

function requireClient() {
  const sb = client();
  if (!sb) throw new Error('The live store database is not configured.');
  return sb;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const sb = client();
    if (sb) {
      const { data: { session } } = await sb.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    }
  } catch {
    // ignore
  }
  return headers;
}


function normalizeProduct(row: any): Product {
  return {
    ...row,
    price: Number(row.price),
    compare_at_price: row.compare_at_price == null ? null : Number(row.compare_at_price),
    genres: (row.product_genres || []).map((link: any) => link.genre).filter(Boolean),
  } as Product;
}

export const publicApi = {
  async getProducts(): Promise<Product[]> {
    const sb = client();
    if (!sb) return DEFAULT_PRODUCTS;
    const { data, error } = await sb.from('products')
      .select('*, category:categories(*), product_genres(genre:genres(*))')
      .eq('status', 'active').order('created_at', { ascending: false });
    if (error) throw new Error('The live catalogue could not be loaded. Please retry.');
    return (data || []).map(normalizeProduct);
  },

  async getProductBySlug(slug: string): Promise<Product | null> {
    const sb = client();
    if (!sb) return DEFAULT_PRODUCTS.find((product) => product.slug === slug) || null;
    const { data, error } = await sb.from('products')
      .select('*, category:categories(*), product_genres(genre:genres(*))')
      .eq('slug', slug).eq('status', 'active').maybeSingle();
    if (error) throw new Error('This title could not be loaded. Please retry.');
    return data ? normalizeProduct(data) : null;
  },

  async getCategories(): Promise<Category[]> {
    let dbCategories: Category[] = [];
    try {
      const sb = client();
      if (sb) {
        const { data, error } = await sb
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order');
        if (!error && data && data.length > 0) {
          dbCategories = data as Category[];
        }
      }
    } catch (err) {
      console.warn('[publicApi] getCategories error:', err);
    }

    if (typeof window !== 'undefined') {
      try {
        const demoRaw = localStorage.getItem('az_rayan_demo_categories_v1');
        const demoCats: Category[] = demoRaw ? JSON.parse(demoRaw) : [];
        const deletedRaw = localStorage.getItem('az_rayan_deleted_categories_v1');
        const deletedIds = new Set<string>(deletedRaw ? JSON.parse(deletedRaw) : []);

        const map = new Map<string, Category>();
        dbCategories.forEach((c) => {
          if (!deletedIds.has(c.id) && c.is_active) map.set(c.id, c);
        });
        demoCats.forEach((c) => {
          if (!deletedIds.has(c.id) && c.is_active) map.set(c.id, c);
        });
        if (map.size > 0) {
          return Array.from(map.values()).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        }
      } catch {
        // ignore
      }
    }

    return dbCategories.length > 0 ? dbCategories : DEFAULT_CATEGORIES;
  },

  async getGenres(): Promise<Genre[]> {
    let dbGenres: Genre[] = [];
    try {
      const sb = client();
      if (sb) {
        const { data, error } = await sb.from('genres').select('*').order('name');
        if (!error && data && data.length > 0) {
          dbGenres = data as Genre[];
        }
      }
    } catch (err) {
      console.warn('[publicApi] getGenres error:', err);
    }

    if (typeof window !== 'undefined') {
      try {
        const demoRaw = localStorage.getItem('az_rayan_demo_genres_v1');
        const demoGenres: Genre[] = demoRaw ? JSON.parse(demoRaw) : [];
        const deletedRaw = localStorage.getItem('az_rayan_deleted_genres_v1');
        const deletedIds = new Set<string>(deletedRaw ? JSON.parse(deletedRaw) : []);

        const map = new Map<string, Genre>();
        dbGenres.forEach((g) => {
          if (!deletedIds.has(g.id)) map.set(g.id, g);
        });
        demoGenres.forEach((g) => {
          if (!deletedIds.has(g.id)) map.set(g.id, g);
        });
        if (map.size > 0) {
          return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
        }
      } catch {
        // ignore
      }
    }

    return dbGenres.length > 0 ? dbGenres : DEFAULT_GENRES;
  },

  async getStoreSettings(): Promise<StoreSettings> {
    try {
      const sb = client();
      if (sb) {
        const { data, error } = await sb.from('store_settings').select('*').limit(1).maybeSingle();
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
      }
    } catch (err) {
      console.warn('[publicApi] Could not load store settings from database, using defaults:', err);
    }

    return DEFAULT_STORE_SETTINGS;
  },

  async getActivePromotions(): Promise<Promotion[]> {
    const now = new Date().toISOString();
    let dbPromotions: Promotion[] = [];
    try {
      const { data, error } = await requireClient()
        .from('promotions')
        .select('*')
        .eq('is_active', true)
        .lte('starts_at', now)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order('created_at', { ascending: false });
      if (!error && data) {
        dbPromotions = (data || []).map((promotion) => ({
          ...promotion,
          value: Number(promotion.value),
          minimum_order: Number(promotion.minimum_order),
        })) as Promotion[];
      }
    } catch (err) {
      console.warn('Could not load DB promotions:', err);
    }

    return dbPromotions;
  },

  async createCheckoutSession(input: CheckoutInput) {
    return checkoutApi.create('card', input);
  },
  async createPayPalOrder(input: CheckoutInput) {
    return checkoutApi.create('paypal', input);
  },
  async createBankTransferOrder(input: CheckoutInput) {
    return checkoutApi.create('bank_transfer', input);
  },
  async getOrderStatus(orderId: string, sessionId?: string, paypalOrderId?: string): Promise<Order> {
    return checkoutApi.orderStatus(orderId, sessionId, paypalOrderId);
  },

  async getMyOrders(): Promise<Order[]> {
    const sb = client();
    let authUser: { id: string; email?: string } | null = null;
    try {
      if (sb) {
        const { data: auth } = await sb.auth.getUser();
        if (auth?.user) authUser = auth.user;
      }
    } catch {
      // ignore
    }

    if (!authUser && typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('az_rayan_customer_profile');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.id) authUser = { id: parsed.id, email: parsed.email };
        }
      } catch {
        // ignore
      }
    }

    if (!authUser) throw new Error('Sign in to view your order history.');

    let dbOrders: Order[] = [];
    try {
      if (sb) {
        const { data, error } = await sb
          .from('orders')
          .select('*, items:order_items(*)')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false });
        if (!error && data) {
          dbOrders = data as Order[];
        }
      }
    } catch (err) {
      console.warn('[publicApi] Could not fetch DB orders:', err);
    }

    // Merge with local demo orders matching user id or email
    let localOrders: Order[] = [];
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('az_rayan_demo_orders_v1');
        if (raw) {
          const list: Order[] = JSON.parse(raw);
          localOrders = list.filter(
            (o) =>
              (authUser?.id && o.user_id === authUser.id) ||
              (authUser?.email && o.email && o.email.toLowerCase() === authUser.email.toLowerCase())
          );
        }
      } catch {
        // ignore
      }
    }

    const seenIds = new Set<string>();
    const seenNumbers = new Set<string>();
    const merged: Order[] = [];

    for (const order of dbOrders) {
      seenIds.add(order.id);
      if (order.order_number) seenNumbers.add(order.order_number);
      merged.push(order);
    }

    for (const order of localOrders) {
      if (!seenIds.has(order.id) && !seenNumbers.has(order.order_number)) {
        seenIds.add(order.id);
        if (order.order_number) seenNumbers.add(order.order_number);
        merged.push(order);
      }
    }

    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return merged;
  },

  async getMyProfile(): Promise<Profile> {
    const sb = requireClient();
    const { data: auth, error: authErr } = await sb.auth.getUser();
    if (authErr || !auth?.user) throw new Error('Sign in to view your profile.');

    const { data, error } = await sb.from('profiles').select('*').eq('id', auth.user.id).maybeSingle();
    if (!error && data) return data as Profile;

    // Fallback: auto-create/sync profile from user metadata if missing
    const meta = auth.user.user_metadata || {};
    const fallback: Profile = {
      id: auth.user.id,
      email: auth.user.email || '',
      full_name: meta.full_name || meta.name || auth.user.email?.split('@')[0] || 'Customer',
      phone: null,
      role: 'customer',
      avatar_url: meta.avatar_url || meta.picture || null,
      created_at: new Date().toISOString(),
    };

    try {
      await sb.from('profiles').upsert(fallback);
    } catch {
      // ignore
    }

    return fallback;
  },

  async updateMyProfile(input: { full_name: string; phone: string | null }): Promise<Profile> {
    const sb = requireClient();
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) throw new Error('Sign in to update your profile.');

    const { data, error } = await sb.from('profiles').update(input).eq('id', auth.user.id).select('*').maybeSingle();
    if (!error && data) return data as Profile;

    const meta = auth.user.user_metadata || {};
    const fullProfile: Profile = {
      id: auth.user.id,
      email: auth.user.email || '',
      full_name: input.full_name,
      phone: input.phone,
      role: 'customer',
      avatar_url: meta.avatar_url || meta.picture || null,
      created_at: new Date().toISOString(),
    };

    const { data: upserted, error: upsertErr } = await sb.from('profiles').upsert(fullProfile).select('*').maybeSingle();
    if (upsertErr || !upserted) {
      return fullProfile;
    }
    return upserted as Profile;
  },

  async getMyAddresses(): Promise<Address[]> {
    const sb = client();
    let authUser: { id: string } | null = null;
    try {
      if (sb) {
        const { data: auth } = await sb.auth.getUser();
        if (auth?.user) authUser = auth.user;
      }
    } catch {
      // ignore
    }

    if (!authUser && typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('az_rayan_customer_profile');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.id) authUser = { id: parsed.id };
        }
      } catch {
        // ignore
      }
    }

    if (!authUser) throw new Error('Sign in to view saved addresses.');
    const userId = authUser.id;
    const localKey = `az_rayan_saved_addresses_${userId}`;

    const getLocalAddresses = (): Address[] => {
      if (typeof window === 'undefined') return [];
      try {
        const raw = localStorage.getItem(localKey);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    };

    try {
      if (sb) {
        const { data, error } = await sb
          .from('addresses')
          .select('*')
          .eq('user_id', userId)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          if (typeof window !== 'undefined') {
            localStorage.setItem(localKey, JSON.stringify(data));
          }
          return data as Address[];
        }
      }
    } catch (err) {
      console.warn('[publicApi] Could not load DB addresses, using local cache:', err);
    }

    return getLocalAddresses();
  },

  async createMyAddress(input: Omit<Address, 'id' | 'user_id'>): Promise<Address> {
    const sb = client();
    let authUser: { id: string } | null = null;
    try {
      if (sb) {
        const { data: auth } = await sb.auth.getUser();
        if (auth?.user) authUser = auth.user;
      }
    } catch {
      // ignore
    }

    if (!authUser && typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('az_rayan_customer_profile');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.id) authUser = { id: parsed.id };
        }
      } catch {
        // ignore
      }
    }

    if (!authUser) throw new Error('Sign in to save an address.');
    const userId = authUser.id;
    const localKey = `az_rayan_saved_addresses_${userId}`;

    const generateId = () => {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
      return 'addr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    };

    // If marked default, unset default on other addresses in DB and local
    if (input.is_default && sb) {
      try {
        await sb.from('addresses').update({ is_default: false }).eq('user_id', userId);
      } catch {
        // ignore
      }
    }

    let created: Address = {
      id: generateId(),
      user_id: userId,
      ...input,
    };

    if (sb) {
      try {
        const { data, error } = await sb
          .from('addresses')
          .insert({ ...input, user_id: userId })
          .select('*')
          .single();
        if (!error && data) {
          created = data as Address;
        }
      } catch (err) {
        console.warn('[publicApi] DB insert address failed, saving locally:', err);
      }
    }

    // Update local cache
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(localKey);
        let list: Address[] = raw ? JSON.parse(raw) : [];
        if (created.is_default) {
          list = list.map((a) => ({ ...a, is_default: false }));
        }
        localStorage.setItem(localKey, JSON.stringify([created, ...list.filter((a) => a.id !== created.id)]));
      } catch {
        // ignore
      }
    }

    return created;
  },

  async updateMyAddress(id: string, input: Partial<Omit<Address, 'id' | 'user_id'>>): Promise<Address> {
    const sb = client();
    let authUser: { id: string } | null = null;
    try {
      if (sb) {
        const { data: auth } = await sb.auth.getUser();
        if (auth?.user) authUser = auth.user;
      }
    } catch {
      // ignore
    }

    if (!authUser && typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('az_rayan_customer_profile');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.id) authUser = { id: parsed.id };
        }
      } catch {
        // ignore
      }
    }

    if (!authUser) throw new Error('Sign in to update an address.');
    const userId = authUser.id;
    const localKey = `az_rayan_saved_addresses_${userId}`;

    // If marked default, unset default on other addresses
    if (input.is_default && sb) {
      try {
        await sb.from('addresses').update({ is_default: false }).eq('user_id', userId);
      } catch {
        // ignore
      }
    }

    let updated: Address | null = null;

    if (sb) {
      try {
        const { data, error } = await sb
          .from('addresses')
          .update(input)
          .eq('id', id)
          .eq('user_id', userId)
          .select('*')
          .maybeSingle();
        if (!error && data) {
          updated = data as Address;
        }
      } catch (err) {
        console.warn('[publicApi] DB update address failed, updating locally:', err);
      }
    }

    // Update local cache
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(localKey);
        let list: Address[] = raw ? JSON.parse(raw) : [];
        if (input.is_default) {
          list = list.map((a) => ({ ...a, is_default: false }));
        }
        const existingIdx = list.findIndex((a) => a.id === id);
        if (existingIdx >= 0) {
          list[existingIdx] = { ...list[existingIdx], ...input };
          updated = updated || list[existingIdx];
        } else if (updated) {
          list.push(updated);
        }
        localStorage.setItem(localKey, JSON.stringify(list));
      } catch {
        // ignore
      }
    }

    if (!updated) {
      throw new Error('Address not found to update.');
    }
    return updated;
  },

  async setDefaultAddress(id: string): Promise<void> {
    const sb = client();
    let authUser: { id: string } | null = null;
    try {
      if (sb) {
        const { data: auth } = await sb.auth.getUser();
        if (auth?.user) authUser = auth.user;
      }
    } catch {
      // ignore
    }

    if (!authUser && typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('az_rayan_customer_profile');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.id) authUser = { id: parsed.id };
        }
      } catch {
        // ignore
      }
    }

    if (!authUser) throw new Error('Sign in to set default address.');
    const userId = authUser.id;
    const localKey = `az_rayan_saved_addresses_${userId}`;

    if (sb) {
      try {
        await sb.from('addresses').update({ is_default: false }).eq('user_id', userId);
        await sb.from('addresses').update({ is_default: true }).eq('id', id).eq('user_id', userId);
      } catch (err) {
        console.warn('[publicApi] DB set default failed:', err);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(localKey);
        if (raw) {
          const list: Address[] = JSON.parse(raw);
          const updated = list.map((a) => ({ ...a, is_default: a.id === id }));
          localStorage.setItem(localKey, JSON.stringify(updated));
        }
      } catch {
        // ignore
      }
    }
  },

  async deleteMyAddress(id: string): Promise<void> {
    const sb = client();
    let authUser: { id: string } | null = null;
    try {
      if (sb) {
        const { data: auth } = await sb.auth.getUser();
        if (auth?.user) authUser = auth.user;
      }
    } catch {
      // ignore
    }

    if (!authUser && typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('az_rayan_customer_profile');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.id) authUser = { id: parsed.id };
        }
      } catch {
        // ignore
      }
    }

    if (!authUser) throw new Error('Sign in to remove an address.');
    const userId = authUser.id;
    const localKey = `az_rayan_saved_addresses_${userId}`;

    if (sb) {
      try {
        await sb.from('addresses').delete().eq('id', id).eq('user_id', userId);
      } catch (err) {
        console.warn('[publicApi] DB delete address failed:', err);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(localKey);
        if (raw) {
          const list: Address[] = JSON.parse(raw);
          const filtered = list.filter((a) => a.id !== id);
          // If deleted address was default, set next available as default
          const wasDefault = list.find((a) => a.id === id)?.is_default;
          if (wasDefault && filtered.length > 0) {
            filtered[0].is_default = true;
          }
          localStorage.setItem(localKey, JSON.stringify(filtered));
        }
      } catch {
        // ignore
      }
    }
  },

  async submitContactMessage(input: { name: string; email: string; order_reference?: string | null; message: string }): Promise<void> {
    const { error } = await requireClient().from('contact_messages').insert({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      order_reference: input.order_reference?.trim() || null,
      message: input.message.trim(),
    });
    if (error) throw new Error(error.message || 'Your message could not be sent. Please try again.');
  },

  async subscribeNewsletter(email: string): Promise<void> {
    const { error } = await requireClient().rpc('subscribe_newsletter', { p_email: email.trim().toLowerCase() });
    if (error) throw new Error(error.message || 'Newsletter subscription could not be saved.');
  },
};
