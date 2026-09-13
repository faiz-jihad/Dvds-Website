import { isSupabaseConfigured, supabase } from './supabase';
import { Address, Category, Genre, Order, Product, Profile, Promotion, StoreSettings } from '../types';
import {
  FALLBACK_CATEGORIES,
  FALLBACK_GENRES,
  FALLBACK_PRODUCTS,
  FALLBACK_PROMOTIONS,
  FALLBACK_STORE_SETTINGS,
} from '../data/fallbackData';

function client() {
  if (!isSupabaseConfigured || !supabase) return null;
  return supabase;
}

function requireClient() {
  const sb = client();
  if (!sb) throw new Error('The live store database is not configured.');
  return sb;
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
    try {
      const sb = client();
      if (sb) {
        const { data, error } = await sb
          .from('products')
          .select('*, category:categories(*), product_genres(genre:genres(*))')
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          return data.map(normalizeProduct);
        }
        if (error) {
          console.warn('[publicApi] getProducts Supabase error, falling back to local archive data:', error.message);
        }
      }
    } catch (err) {
      console.warn('[publicApi] getProducts exception, falling back:', err);
    }
    return FALLBACK_PRODUCTS;
  },

  async getProductBySlug(slug: string): Promise<Product | null> {
    try {
      const sb = client();
      if (sb) {
        const { data, error } = await sb
          .from('products')
          .select('*, category:categories(*), product_genres(genre:genres(*))')
          .eq('slug', slug)
          .eq('status', 'active')
          .maybeSingle();
        if (!error && data) {
          return normalizeProduct(data);
        }
        if (error) {
          console.warn('[publicApi] getProductBySlug Supabase error, falling back:', error.message);
        }
      }
    } catch (err) {
      console.warn('[publicApi] getProductBySlug exception, falling back:', err);
    }
    const fallback = FALLBACK_PRODUCTS.find((p) => p.slug === slug);
    return fallback || null;
  },

  async getCategories(): Promise<Category[]> {
    try {
      const sb = client();
      if (sb) {
        const { data, error } = await sb
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order');
        if (!error && data && data.length > 0) {
          return data as Category[];
        }
        if (error) {
          console.warn('[publicApi] getCategories Supabase error, falling back:', error.message);
        }
      }
    } catch (err) {
      console.warn('[publicApi] getCategories exception, falling back:', err);
    }
    return FALLBACK_CATEGORIES;
  },

  async getGenres(): Promise<Genre[]> {
    try {
      const sb = client();
      if (sb) {
        const { data, error } = await sb
          .from('genres')
          .select('*')
          .order('name');
        if (!error && data && data.length > 0) {
          return data as Genre[];
        }
        if (error) {
          console.warn('[publicApi] getGenres Supabase error, falling back:', error.message);
        }
      }
    } catch (err) {
      console.warn('[publicApi] getGenres exception, falling back:', err);
    }
    return FALLBACK_GENRES;
  },

  async getStoreSettings(): Promise<StoreSettings> {
    try {
      const sb = client();
      if (sb) {
        const { data, error } = await sb
          .from('store_settings')
          .select('*')
          .limit(1)
          .maybeSingle();
        if (!error && data) {
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
        }
        if (error) {
          console.warn('[publicApi] getStoreSettings Supabase error, falling back:', error.message);
        }
      }
    } catch (err) {
      console.warn('[publicApi] getStoreSettings exception, falling back:', err);
    }
    return FALLBACK_STORE_SETTINGS;
  },

  async getActivePromotions(): Promise<Promotion[]> {
    try {
      const sb = client();
      if (sb) {
        const now = new Date().toISOString();
        const { data, error } = await sb
          .from('promotions')
          .select('*')
          .eq('is_active', true)
          .lte('starts_at', now)
          .or(`ends_at.is.null,ends_at.gte.${now}`)
          .order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          return data.map((promotion) => ({
            ...promotion,
            value: Number(promotion.value),
            minimum_order: Number(promotion.minimum_order),
          })) as Promotion[];
        }
      }
    } catch (err) {
      console.warn('[publicApi] getActivePromotions exception, falling back:', err);
    }
    return FALLBACK_PROMOTIONS;
  },

  async createCheckoutSession(input: {
    items: { product_id: string; quantity: number }[];
    customerEmail: string;
    shippingAddress: Address;
    deliveryTier: 'standard' | 'express';
    promoCode?: string | null;
  }): Promise<{ url: string }> {
    const { data, error } = await requireClient().functions.invoke('create-checkout-session', { body: input });
    if (error) throw new Error(error.message || 'Secure checkout could not be started.');
    if (!data?.url) throw new Error(data?.error || 'Stripe did not return a checkout URL.');
    return { url: data.url };
  },

  async getOrderStatus(orderId: string, sessionId?: string): Promise<Order> {
    if (sessionId) {
      const { data, error } = await requireClient().functions.invoke('get-order-status', { body: { orderId, sessionId } });
      if (error || !data?.order) throw new Error(error?.message || data?.error || 'Order could not be verified.');
      return data.order as Order;
    }
    const { data, error } = await requireClient().from('orders').select('*, items:order_items(*)').eq('id', orderId).single();
    if (error || !data) throw new Error(error?.message || 'Sign in to view this order.');
    return data as Order;
  },

  async getMyOrders(): Promise<Order[]> {
    const { data: auth } = await requireClient().auth.getUser();
    if (!auth.user) throw new Error('Sign in to view your order history.');
    const { data, error } = await requireClient().from('orders').select('*, items:order_items(*)').eq('user_id', auth.user.id).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as Order[];
  },

  async getMyProfile(): Promise<Profile> {
    const { data: auth } = await requireClient().auth.getUser();
    if (!auth.user) throw new Error('Sign in to view your profile.');
    const { data, error } = await requireClient().from('profiles').select('*').eq('id', auth.user.id).single();
    if (error || !data) throw new Error(error?.message || 'Profile could not be loaded.');
    return data as Profile;
  },

  async updateMyProfile(input: { full_name: string; phone: string | null }): Promise<Profile> {
    const { data: auth } = await requireClient().auth.getUser();
    if (!auth.user) throw new Error('Sign in to update your profile.');
    const { data, error } = await requireClient().from('profiles').update(input).eq('id', auth.user.id).select('*').single();
    if (error || !data) throw new Error(error?.message || 'Profile could not be updated.');
    return data as Profile;
  },

  async getMyAddresses(): Promise<Address[]> {
    const { data: auth } = await requireClient().auth.getUser();
    if (!auth.user) throw new Error('Sign in to view saved addresses.');
    const { data, error } = await requireClient().from('addresses').select('*').eq('user_id', auth.user.id).order('is_default', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as Address[];
  },

  async createMyAddress(input: Omit<Address, 'id' | 'user_id'>): Promise<Address> {
    const { data: auth } = await requireClient().auth.getUser();
    if (!auth.user) throw new Error('Sign in to save an address.');
    const { data, error } = await requireClient().from('addresses').insert({ ...input, user_id: auth.user.id }).select('*').single();
    if (error || !data) throw new Error(error?.message || 'Address could not be saved.');
    return data as Address;
  },

  async deleteMyAddress(id: string): Promise<void> {
    const { data: auth } = await requireClient().auth.getUser();
    if (!auth.user) throw new Error('Sign in to remove an address.');
    const { error } = await requireClient().from('addresses').delete().eq('id', id).eq('user_id', auth.user.id);
    if (error) throw new Error(error.message);
  },

  async submitContactMessage(input: { name: string; email: string; order_reference?: string | null; message: string }): Promise<void> {
    try {
      const sb = client();
      if (sb) {
        const { error } = await sb.from('contact_messages').insert({
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          order_reference: input.order_reference?.trim() || null,
          message: input.message.trim(),
        });
        if (!error) return;
      }
    } catch {
      // Graceful fallback
    }
    console.log('[publicApi] Contact message recorded (demo/fallback):', input);
  },

  async subscribeNewsletter(email: string): Promise<void> {
    try {
      const sb = client();
      if (sb) {
        const { error } = await sb.rpc('subscribe_newsletter', { p_email: email.trim().toLowerCase() });
        if (!error) return;
      }
    } catch {
      // Graceful fallback
    }
    console.log('[publicApi] Newsletter subscription recorded (demo/fallback):', email);
  },
};
