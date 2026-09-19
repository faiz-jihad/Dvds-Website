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
    const sb = client();
    if (!sb) return DEFAULT_CATEGORIES;
    const { data, error } = await sb.from('categories').select('*').eq('is_active', true).order('sort_order');
    if (error) throw new Error('Categories could not be loaded. Please retry.');
    return data || [];
  },

  async getGenres(): Promise<Genre[]> {
    const sb = client();
    if (!sb) return DEFAULT_GENRES;
    const { data, error } = await sb.from('genres').select('*').order('name');
    if (error) throw new Error('Genres could not be loaded. Please retry.');
    return data || [];
  },

  async getStoreSettings(): Promise<StoreSettings> {
    const sb = client();
    let localOverride: Partial<StoreSettings> = {};
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('dvds_store_settings_override') : null;
      if (stored) localOverride = JSON.parse(stored);
    } catch {}

    if (!sb) return { ...DEFAULT_STORE_SETTINGS, ...localOverride };
    const { data, error } = await sb.from('store_settings').select('*').eq('singleton', true).maybeSingle();
    if (error || !data) throw new Error('Store settings are unavailable. Please retry.');

    return {
      ...DEFAULT_STORE_SETTINGS,
      ...data,
      hero_youtube_enabled: data.hero_youtube_enabled ?? DEFAULT_STORE_SETTINGS.hero_youtube_enabled ?? false,
      hero_youtube_url: data.hero_youtube_url ?? DEFAULT_STORE_SETTINGS.hero_youtube_url ?? '',
      hero_trailers: Array.isArray(data.hero_trailers) ? data.hero_trailers : (DEFAULT_STORE_SETTINGS.hero_trailers || []),
      ...localOverride,
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

  async getActivePromotions(): Promise<Promotion[]> {
    const sb = client();
    if (!sb) return [];
    const now = new Date().toISOString();
    const { data, error } = await sb.from('promotions').select('*').eq('is_active', true)
      .lte('starts_at', now).or(`ends_at.is.null,ends_at.gte.${now}`).order('created_at', { ascending: false });
    if (error) throw new Error('Promotions could not be loaded. Please retry.');
    return (data || []).map((promotion) => ({ ...promotion,
      value: Number(promotion.value), minimum_order: Number(promotion.minimum_order),
    })) as Promotion[];
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
    const sb = requireClient();
    const { data: auth, error: authError } = await sb.auth.getUser();
    if (authError || !auth?.user) throw new Error('Sign in to view your order history.');

    let rawOrders: any[] = [];
    // Attempt to join product to get latest cover image and details
    const joined = await sb
      .from('orders')
      .select('*, items:order_items(*, product:products(cover_image_url))')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (!joined.error && joined.data) {
      rawOrders = joined.data;
    } else {
      // Fallback query if nested relation fails
      const fallback = await sb
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false });
      if (fallback.error) throw new Error('Your orders could not be loaded. Please retry.');
      rawOrders = fallback.data || [];
    }

    return rawOrders.map((order: any) => ({
      ...order,
      subtotal: Number(order.subtotal || 0),
      shipping_amount: Number(order.shipping_amount || 0),
      discount_amount: Number(order.discount_amount || 0),
      total_amount: Number(order.total_amount || 0),
      refunded_amount: Number(order.refunded_amount || 0),
      shipping_address: order.shipping_address || {},
      items: (order.items || []).map((item: any) => ({
        ...item,
        unit_price: Number(item.unit_price || 0),
        total_price: Number(item.total_price || 0),
        cover_image_url:
          item.cover_image_url ||
          item.product_snapshot?.cover_image_url ||
          item.product?.cover_image_url ||
          undefined,
      })),
    })) as Order[];
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
