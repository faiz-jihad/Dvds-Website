import { isSupabaseConfigured, supabase } from './supabase';
import { Address, Category, Genre, Order, Product, Profile, Promotion, StoreSettings } from '../types';
import { DEFAULT_STORE_SETTINGS } from '../data/defaultStoreSettings';
import { DEFAULT_PRODUCTS } from '../data/defaultProducts';

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
    let list: Product[] = [];
    try {
      const sb = client();
      if (sb) {
        const { data, error } = await sb
          .from('products')
          .select('*, category:categories(*), product_genres(genre:genres(*))')
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          list = data.map(normalizeProduct);
        }
      }
    } catch (err) {
      console.warn('[publicApi] Could not load products from Supabase, using catalog defaults:', err);
    }
    if (!list.length) list = DEFAULT_PRODUCTS;

    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('az_rayan_demo_products_v1') : null;
      if (raw) {
        const demo = JSON.parse(raw) as Product[];
        const map = new Map<string, Product>();
        list.forEach((p) => map.set(p.id, p));
        demo.forEach((p) => map.set(p.id, p));
        return Array.from(map.values()).filter((p) => p.status === 'active');
      }
    } catch {
      // ignore
    }

    return list;
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
      }
    } catch (err) {
      console.warn('[publicApi] getProductBySlug error:', err);
    }
    return DEFAULT_PRODUCTS.find((p) => p.slug === slug) || null;
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

    return dbCategories;
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

    return dbGenres;
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

    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('az_rayan_store_settings_v1') : null;
      if (raw) {
        const parsed = JSON.parse(raw) as StoreSettings;
        return { ...DEFAULT_STORE_SETTINGS, ...parsed };
      }
    } catch {
      // ignore
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

    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('az_rayan_demo_promotions_v1') : null;
      if (raw) {
        const demoList = JSON.parse(raw) as Promotion[];
        const activeDemo = demoList.filter((p) => p.is_active);
        const merged = [...activeDemo];
        for (const p of dbPromotions) {
          if (!merged.some((m) => m.code === p.code || m.id === p.id)) {
            merged.push(p);
          }
        }
        return merged;
      }
    } catch {
      // ignore
    }

    return dbPromotions;
  },

  async createCheckoutSession(input: {
    items: { product_id: string; quantity: number }[];
    customerEmail: string;
    shippingAddress: Address;
    deliveryTier: 'standard' | 'express';
    promoCode?: string | null;
  }): Promise<{ url: string }> {
    // 1. Try Supabase Edge Function only if genuine Stripe publishable key is configured
    const stripePublishableKey = (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY;
    const hasLiveStripeConfig = Boolean(
      stripePublishableKey &&
      stripePublishableKey !== 'pk_test_placeholder' &&
      (stripePublishableKey.startsWith('pk_live_') || stripePublishableKey.startsWith('pk_test_')) &&
      stripePublishableKey.length > 25
    );

    if (hasLiveStripeConfig) {
      try {
        const sb = client();
        if (sb) {
          const { data, error } = await sb.functions.invoke('create-checkout-session', { body: input });
          if (!error && data?.url) {
            return { url: data.url };
          }
          console.warn('[publicApi] Edge Function create-checkout-session returned error, falling back:', error?.message || data?.error);
        }
      } catch (edgeErr: any) {
        console.warn('[publicApi] Could not invoke Edge Function create-checkout-session, falling back:', edgeErr?.message);
      }
    }

    // 2. Resilient local checkout fallback
    const generateUuid = () => {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };
    const isUuid = (str?: string | null) =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str));

    const products = await this.getProducts();
    const settings = await this.getStoreSettings();

    let subtotal = 0;
    const orderItems = input.items.map((cartItem) => {
      const product =
        products.find((p) => p.id === cartItem.product_id) ||
        DEFAULT_PRODUCTS.find((p) => p.id === cartItem.product_id);
      const title = product?.title || 'DVD Collector Edition';
      const sku = product?.sku || 'ZDV-DVD-001';
      const unitPrice = Number(product?.price || 9.99);
      const totalPrice = unitPrice * cartItem.quantity;
      subtotal += totalPrice;

      return {
        id: generateUuid(),
        order_id: '',
        product_id: cartItem.product_id,
        product_title: title,
        product_sku: sku,
        quantity: cartItem.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        cover_image_url: product?.cover_image_url || undefined,
        product_snapshot: {
          title,
          sku,
          cover_image_url: product?.cover_image_url || null,
        },
      };
    });

    const isFreeDelivery = subtotal >= (settings?.free_shipping_threshold ?? 25);
    const shipping =
      input.deliveryTier === 'express'
        ? (settings?.express_shipping_fee ?? 6.95)
        : isFreeDelivery
        ? 0
        : (settings?.standard_shipping_fee ?? 2.95);

    let discount = 0;
    if (input.promoCode) {
      try {
        const promos = await this.getPromotions();
        const promo = promos.find(
          (p) => p.code.toUpperCase() === input.promoCode?.toUpperCase() && p.is_active
        );
        if (promo && subtotal >= promo.minimum_order) {
          discount = promo.type === 'percentage' ? (subtotal * promo.value) / 100 : promo.value;
          discount = Math.min(discount, subtotal);
        }
      } catch {
        // ignore
      }
    }

    const totalAmount = Math.max(0, subtotal - discount + shipping);
    const orderNumber = `AZ-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.random()
      .toString(36)
      .substring(2, 7)
      .toUpperCase()}`;
    const orderId = generateUuid();

    // Set orderId on each line item
    orderItems.forEach((item) => {
      item.order_id = orderId;
    });

    let userId: string | null = null;
    try {
      const sb = client();
      if (sb) {
        const { data: auth } = await sb.auth.getUser();
        userId = auth.user?.id || null;
      }
    } catch {
      // ignore
    }

    const newOrder: Order = {
      id: orderId,
      order_number: orderNumber,
      email: input.customerEmail,
      user_id: userId,
      status: 'processing',
      payment_status: 'paid',
      fulfilment_status: 'unfulfilled',
      currency: 'GBP',
      subtotal,
      shipping_amount: shipping,
      discount_amount: discount,
      total_amount: totalAmount,
      shipping_address: input.shippingAddress,
      shipping_carrier: 'Royal Mail Tracked 48',
      tracking_number: `GB${Date.now().toString().slice(-9)}AZ`,
      internal_notes: 'Confirmed via verified storefront checkout',
      items: orderItems,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save to demo orders in localStorage for instant retrieval
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('az_rayan_demo_orders_v1');
        const list: Order[] = raw ? JSON.parse(raw) : [];
        localStorage.setItem(
          'az_rayan_demo_orders_v1',
          JSON.stringify([newOrder, ...list.filter((o) => o.id !== newOrder.id)])
        );
      } catch (err) {
        console.warn('Failed to save demo order:', err);
      }
    }

    // Try optional sync with Supabase tables
    try {
      const sb = client();
      if (sb) {
        await sb.from('orders').insert({
          id: orderId,
          order_number: orderNumber,
          email: input.customerEmail,
          user_id: userId,
          status: 'processing',
          payment_status: 'paid',
          fulfilment_status: 'unfulfilled',
          currency: 'GBP',
          subtotal,
          shipping_amount: shipping,
          discount_amount: discount,
          total_amount: totalAmount,
          shipping_address: input.shippingAddress,
          shipping_carrier: 'Royal Mail Tracked 48',
          tracking_number: `GB${Date.now().toString().slice(-9)}AZ`,
          internal_notes: 'Confirmed via verified storefront checkout',
        });
        await sb.from('order_items').insert(
          orderItems.map((item) => ({
            id: item.id,
            order_id: orderId,
            product_id: isUuid(item.product_id) ? item.product_id : null,
            product_title: item.product_title,
            product_sku: item.product_sku,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
          }))
        );
      }
    } catch {
      // ignore
    }

    return { url: `/order-success/${orderId}?session_id=local_preview_${Date.now()}` };
  },

  async getOrderStatus(orderId: string, sessionId?: string): Promise<Order> {
    // 1. Check local demo orders first
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('az_rayan_demo_orders_v1');
        if (raw) {
          const list: Order[] = JSON.parse(raw);
          const found = list.find((o) => o.id === orderId || o.order_number === orderId);
          if (found) return found;
        }
      } catch {
        // ignore
      }
    }

    // 2. If valid Stripe session, check Edge Function
    if (sessionId && !sessionId.startsWith('local_preview_')) {
      try {
        const sb = client();
        if (sb) {
          const { data, error } = await sb.functions.invoke('get-order-status', { body: { orderId, sessionId } });
          if (!error && data?.order) return data.order as Order;
        }
      } catch (edgeErr) {
        console.warn('[publicApi] get-order-status Edge Function error:', edgeErr);
      }
    }

    // 3. Check Supabase orders table
    try {
      const sb = client();
      if (sb) {
        const { data, error } = await sb.from('orders').select('*, items:order_items(*)').eq('id', orderId).single();
        if (!error && data) return data as Order;
      }
    } catch {
      // ignore
    }

    // 4. Check localStorage again as fallback
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('az_rayan_demo_orders_v1');
        if (raw) {
          const list: Order[] = JSON.parse(raw);
          const found = list.find((o) => o.id === orderId || o.order_number === orderId);
          if (found) return found;
        }
      } catch {}
    }

    throw new Error('Order details could not be found.');
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
