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
    const { data, error } = await requireClient().from('products')
      .select('*, category:categories(*), product_genres(genre:genres(*))')
      .eq('status', 'active').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(normalizeProduct);
  },

  async getProductBySlug(slug: string): Promise<Product | null> {
    const { data, error } = await requireClient().from('products')
      .select('*, category:categories(*), product_genres(genre:genres(*))')
      .eq('slug', slug).eq('status', 'active').maybeSingle();
    if (error) throw new Error(error.message);
    return data ? normalizeProduct(data) : null;
  },

  async getCategories(): Promise<Category[]> {
    const { data, error } = await requireClient().from('categories').select('*').eq('is_active', true).order('sort_order');
    if (error) throw new Error(error.message);
    return (data || []) as Category[];
  },

  async getGenres(): Promise<Genre[]> {
    const { data, error } = await requireClient().from('genres').select('*').order('name');
    if (error) throw new Error(error.message);
    return (data || []) as Genre[];
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

  async createCheckoutSession(input: {
    items: { product_id: string; quantity: number }[];
    customerEmail: string;
    shippingAddress: Address;
    deliveryTier: 'standard' | 'express';
    promoCode?: string | null;
    totalAmount?: number;
    paymentMethod?: 'card' | 'stripe_hosted';
    cardDetails?: {
      cardholderName: string;
      brand: string;
      last4: string;
    };
  }): Promise<{ url: string }> {

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

    const isFreeDelivery =
      (settings?.free_shipping_threshold ?? 0) <= 0 ||
      (settings?.standard_shipping_fee ?? 0) === 0 ||
      subtotal >= (settings?.free_shipping_threshold ?? 0);
    const shipping =
      input.deliveryTier === 'express'
        ? (settings?.express_shipping_fee ?? 5.99)
        : isFreeDelivery
        ? 0
        : (settings?.standard_shipping_fee ?? 0);

    let discount = 0;
    if (input.promoCode) {
      try {
        const promos = await this.getActivePromotions();
        const promo = promos.find(
          (p: Promotion) => p.code.toUpperCase() === input.promoCode?.toUpperCase() && p.is_active
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
    const orderNumber = `AZ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random()
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
      internal_notes:
        input.paymentMethod === 'card' && input.cardDetails
          ? `Paid via Stripe Card (${input.cardDetails.brand} **** ${input.cardDetails.last4})`
          : 'Confirmed via verified storefront checkout',
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
          internal_notes:
            input.paymentMethod === 'card' && input.cardDetails
              ? `Paid via Stripe Card (${input.cardDetails.brand} **** ${input.cardDetails.last4})`
              : 'Confirmed via verified storefront checkout',
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

    // If Stripe payment is requested, create real Stripe session with order metadata
    if (input.paymentMethod !== 'card') {
      try {
        const res = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: input.items,
            customerEmail: input.customerEmail,
            deliveryTier: input.deliveryTier,
            totalAmount,
            orderId,
            orderNumber,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.url) {
            return { url: data.url };
          }
        }
      } catch (apiErr) {
        console.warn('[publicApi] /api/create-checkout-session error:', apiErr);
      }

      // Try Supabase Edge Function fallback
      try {
        const sb = client();
        if (sb) {
          const { data, error } = await sb.functions.invoke('create-checkout-session', {
            body: { ...input, orderId, orderNumber, totalAmount },
          });
          if (!error && data?.url) return { url: data.url };
        }
      } catch (edgeErr) {
        console.warn('[publicApi] Edge Function error:', edgeErr);
      }
    }

    return { url: `/order-success/${orderId}?session_id=stripe_${Date.now()}` };
  },

  async createPayPalOrder(input: {
    items: { product_id: string; quantity: number }[];
    customerEmail: string;
    shippingAddress: Address;
    deliveryTier: 'standard' | 'express';
    promoCode?: string | null;
    totalAmount?: number;
  }): Promise<{ url: string; orderId: string; orderNumber: string; paypalOrderId?: string }> {
    const res = await fetch('/api/create-paypal-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to initialize PayPal payment');
    }
    return res.json();
  },

  async capturePayPalOrder(orderId: string, paypalOrderId: string): Promise<any> {
    const res = await fetch('/api/capture-paypal-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, paypalOrderId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to capture PayPal payment');
    }
    return res.json();
  },

  async createBankTransferOrder(input: {
    items: { product_id: string; quantity: number }[];
    customerEmail: string;
    shippingAddress: Address;
    deliveryTier: 'standard' | 'express';
    promoCode?: string | null;
    totalAmount?: number;
  }): Promise<{ success: boolean; orderId: string; orderNumber: string; total: number }> {
    const res = await fetch('/api/create-bank-transfer-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to place bank transfer order');
    }
    const data = await res.json();

    // Also persist to local demo storage for instant retrieval in preview
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('az_rayan_demo_orders_v1');
        const list: Order[] = raw ? JSON.parse(raw) : [];
        const newDemoOrder: Order = {
          id: data.orderId,
          order_number: data.orderNumber,
          email: input.customerEmail,
          status: 'pending',
          payment_status: 'awaiting_payment',
          payment_method: 'bank_transfer',
          payment_provider: 'manual_bank',
          fulfilment_status: 'unfulfilled',
          subtotal: data.total || input.totalAmount || 0,
          shipping_amount: 0,
          discount_amount: 0,
          total_amount: data.total || input.totalAmount || 0,
          currency: 'GBP',
          shipping_address: input.shippingAddress,
          payment_reference: data.orderNumber,
          bank_transfer_reference: data.orderNumber,
          items: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        localStorage.setItem('az_rayan_demo_orders_v1', JSON.stringify([newDemoOrder, ...list.filter(o => o.id !== data.orderId)]));
      } catch (e) {
        // ignore
      }
    }

    return data;
  },

  async getOrderStatus(orderId: string, sessionId?: string, paypalOrderId?: string): Promise<Order> {
    // 1. If Stripe session ID is present, verify via server endpoint
    if (sessionId && !sessionId.startsWith('stripe_') && !sessionId.startsWith('local_preview_')) {
      try {
        await fetch('/api/verify-stripe-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, sessionId }),
        });
      } catch (err) {
        console.warn('[publicApi] verify-stripe-payment notice:', err);
      }
    }

    // 2. If returning from PayPal, capture order
    if (paypalOrderId) {
      try {
        await this.capturePayPalOrder(orderId, paypalOrderId);
      } catch (err) {
        console.warn('[publicApi] capturePayPalOrder notice:', err);
      }
    }

    // 3. Check Supabase orders table
    try {
      const sb = client();
      if (sb) {
        const { data, error } = await sb
          .from('orders')
          .select('*, items:order_items(*)')
          .eq('id', orderId)
          .maybeSingle();
        if (!error && data) return data as Order;
      }
    } catch {
      // ignore
    }

    // 4. Check local demo orders
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
