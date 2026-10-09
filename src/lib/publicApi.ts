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


function getCachedProductImages(productId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('dvdszone_product_images_cache');
    if (!raw) return [];
    const map = JSON.parse(raw);
    return Array.isArray(map[productId]) ? map[productId] : [];
  } catch {
    return [];
  }
}

function normalizeProduct(row: any): Product {
  const cached = getCachedProductImages(row.id);
  const rawImages: string[] = [];
  if (Array.isArray(row.images)) rawImages.push(...row.images);
  if (Array.isArray(row.product_images)) {
    const sorted = [...row.product_images].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    rawImages.push(...sorted.map((item: any) => item.image_url));
  }
  if (cached.length > 0) rawImages.push(...cached);
  if (row.cover_image_url) rawImages.unshift(row.cover_image_url);

  const cleanImages = Array.from(new Set(rawImages.filter(Boolean))).slice(0, 6);

  return {
    ...row,
    price: Number(row.price),
    compare_at_price: row.compare_at_price == null ? null : Number(row.compare_at_price),
    genres: (row.product_genres || []).map((link: any) => link.genre).filter(Boolean),
    images: cleanImages.length > 0 ? cleanImages : (row.cover_image_url ? [row.cover_image_url] : []),
  } as Product;
}

export const publicApi = {
  async getProducts(): Promise<Product[]> {
    const sb = client();
    if (!sb) return DEFAULT_PRODUCTS.map(normalizeProduct);
    const { data, error } = await sb.from('products')
      .select('*, category:categories(*), product_genres(genre:genres(*))')
      .eq('status', 'active').order('created_at', { ascending: false });
    if (error) throw new Error('The live catalogue could not be loaded. Please retry.');
    return (data || []).map(normalizeProduct);
  },

  async getProductBySlug(slug: string): Promise<Product | null> {
    const sb = client();
    if (!sb) {
      const found = DEFAULT_PRODUCTS.find((product) => product.slug === slug);
      return found ? normalizeProduct(found) : null;
    }
    const { data, error } = await sb.from('products')
      .select('*, category:categories(*), product_genres(genre:genres(*))')
      .eq('slug', slug).eq('status', 'active').maybeSingle();
    if (error) throw new Error('This product could not be loaded. Please retry.');
    if (!data) return null;

    let extraImages: string[] = [];
    try {
      const { data: imgData } = await sb.from('product_images').select('image_url').eq('product_id', data.id).order('sort_order', { ascending: true });
      if (imgData && imgData.length > 0) {
        extraImages = imgData.map((r: any) => r.image_url).filter(Boolean);
      }
    } catch {
      // optional product_images table
    }

    const norm = normalizeProduct(data);
    if (extraImages.length > 0) {
      norm.images = Array.from(new Set([norm.cover_image_url, ...extraImages, ...(norm.images || [])].filter(Boolean))).slice(0, 6);
    }
    return norm;
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
    if (!sb) return { ...DEFAULT_STORE_SETTINGS };
    const { data, error } = await sb.from('store_settings').select('*').eq('singleton', true).maybeSingle();
    if (error || !data) throw new Error('Store settings are unavailable. Please retry.');

    let heroTrailers = Array.isArray(data.hero_trailers) && data.hero_trailers.length > 0 ? data.hero_trailers : [];
    let heroYoutubeEnabled = data.hero_youtube_enabled;
    let heroYoutubeUrl = data.hero_youtube_url;
    let heroYoutubeMute = data.hero_youtube_mute;
    let heroYoutubeLoop = data.hero_youtube_loop;
    let heroYoutubeStartMinutes = data.hero_youtube_start_minutes;
    let heroYoutubeStartSeconds = data.hero_youtube_start_seconds;
    let heroYoutubeEndMinutes = data.hero_youtube_end_minutes;
    let heroYoutubeEndSeconds = data.hero_youtube_end_seconds;

    if (data.hero_bg_image && data.hero_bg_image.startsWith('HERO_META:')) {
      try {
        const meta = JSON.parse(data.hero_bg_image.slice('HERO_META:'.length));
        if (heroTrailers.length === 0 && Array.isArray(meta.hero_trailers) && meta.hero_trailers.length > 0) {
          heroTrailers = meta.hero_trailers;
        }
        if (heroYoutubeEnabled === undefined && meta.hero_youtube_enabled !== undefined) heroYoutubeEnabled = meta.hero_youtube_enabled;
        if (!heroYoutubeUrl && meta.hero_youtube_url) heroYoutubeUrl = meta.hero_youtube_url;
        if (heroYoutubeMute === undefined && meta.hero_youtube_mute !== undefined) heroYoutubeMute = meta.hero_youtube_mute;
        if (heroYoutubeLoop === undefined && meta.hero_youtube_loop !== undefined) heroYoutubeLoop = meta.hero_youtube_loop;
        if (heroYoutubeStartMinutes === undefined && meta.hero_youtube_start_minutes !== undefined) heroYoutubeStartMinutes = meta.hero_youtube_start_minutes;
        if (heroYoutubeStartSeconds === undefined && meta.hero_youtube_start_seconds !== undefined) heroYoutubeStartSeconds = meta.hero_youtube_start_seconds;
        if (heroYoutubeEndMinutes === undefined && meta.hero_youtube_end_minutes !== undefined) heroYoutubeEndMinutes = meta.hero_youtube_end_minutes;
        if (heroYoutubeEndSeconds === undefined && meta.hero_youtube_end_seconds !== undefined) heroYoutubeEndSeconds = meta.hero_youtube_end_seconds;
      } catch {}
    }

    if (heroTrailers.length === 0 && typeof window !== 'undefined') {
      try {
        const local = localStorage.getItem('dvds_hero_trailers');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            heroTrailers = parsed;
          }
        }
      } catch {}
    }

    const result = {
      ...DEFAULT_STORE_SETTINGS,
      ...data,
      hero_youtube_enabled: heroYoutubeEnabled ?? DEFAULT_STORE_SETTINGS.hero_youtube_enabled ?? false,
      hero_youtube_url: heroYoutubeUrl ?? DEFAULT_STORE_SETTINGS.hero_youtube_url ?? '',
      hero_youtube_mute: heroYoutubeMute ?? DEFAULT_STORE_SETTINGS.hero_youtube_mute ?? true,
      hero_youtube_loop: heroYoutubeLoop ?? DEFAULT_STORE_SETTINGS.hero_youtube_loop ?? true,
      hero_youtube_start_minutes: heroYoutubeStartMinutes ?? DEFAULT_STORE_SETTINGS.hero_youtube_start_minutes ?? 0,
      hero_youtube_start_seconds: heroYoutubeStartSeconds ?? DEFAULT_STORE_SETTINGS.hero_youtube_start_seconds ?? 0,
      hero_youtube_end_minutes: heroYoutubeEndMinutes ?? DEFAULT_STORE_SETTINGS.hero_youtube_end_minutes,
      hero_youtube_end_seconds: heroYoutubeEndSeconds ?? DEFAULT_STORE_SETTINGS.hero_youtube_end_seconds,
      hero_trailers: heroTrailers,
      deal_discount_price: Number(data.deal_discount_price ?? 0),
      free_shipping_threshold: Number(data.free_shipping_threshold ?? 0),
      standard_shipping_fee: Number(data.standard_shipping_fee ?? 0),
      express_shipping_fee: Number(data.express_shipping_fee ?? 0),
      low_stock_threshold: Number(data.low_stock_threshold ?? 5),
      budget_collection_threshold: Number(data.budget_collection_threshold ?? 15),
      vip_promo_discount: Number(data.vip_promo_discount ?? 0),
      vip_min_spend: Number(data.vip_min_spend ?? 0),
    } as StoreSettings;

    // Strict privacy protection: clean jurisdiction to United Kingdom
    if (!result.registered_office_address || result.registered_office_address.includes('Ryland') || result.registered_office_address.includes('Apartment') || result.registered_office_address.includes('Birmingham') || result.registered_office_address.includes('West Midlands')) {
      result.registered_office_address = 'United Kingdom';
    }
    if (!result.warehouse_location || result.warehouse_location.includes('Ryland') || result.warehouse_location.includes('Apartment') || result.warehouse_location.includes('London') || result.warehouse_location.includes('Birmingham') || result.warehouse_location.includes('West Midlands')) {
      result.warehouse_location = 'United Kingdom';
    }
    if (!result.store_name || result.store_name.includes('AZ Rayan')) {
      result.store_name = 'DVDs Zone';
    }
    if (!result.registered_company_name || result.registered_company_name.includes('AZ Rayan')) {
      result.registered_company_name = 'DVDs Zone';
    }
    const rawEmail = data.support_email?.trim() || '';
    result.support_email = (!rawEmail || rawEmail.includes('azrayan.co.uk') || rawEmail.includes('concierge')) ? 'azrayanltd@gmail.com' : rawEmail;
    result.support_phone = data.support_phone?.trim() || '00447400320038';
    return result;
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
      const isRelationError = joined.error?.message?.includes('relationship') || joined.error?.code === 'PGRST200';
      if (joined.error && !isRelationError) {
        throw new Error('Your orders could not be loaded. Please retry.');
      }
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
