export type AgeRating = 'U' | 'PG' | '12' | '15' | '18';
export type DvdFormat = 'DVD' | 'Blu-ray' | '4K UHD' | 'Box Set';
export type ProductStatus = 'draft' | 'active' | 'archived';
export type OrderStatus = 'pending' | 'processing' | 'dispatched' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'awaiting_payment' | 'paid' | 'failed' | 'refunded' | 'partially_refunded' | 'unpaid';
export type PaymentMethodType = 'card' | 'paypal' | 'bank_transfer';
export type PaymentProviderType = 'stripe' | 'paypal' | 'manual_bank';
export type FulfilmentStatus = 'unfulfilled' | 'fulfilled' | 'returned';
export type UserRole = 'customer' | 'admin' | 'staff';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  sku: string;
  title: string;
  slug: string;
  description: string;
  short_description: string | null;
  category_id: string | null;
  category?: Category;
  format: DvdFormat;
  release_year: number;
  runtime_minutes: number;
  age_rating: AgeRating;
  region_code: string;
  language: string;
  subtitles: string;
  condition: string;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  cover_image_url: string;
  status: ProductStatus;
  is_featured: boolean;
  is_new_release: boolean;
  is_best_seller: boolean;
  created_at: string;
  updated_at: string;
  genres?: Genre[];
  // Boutique physical media fields (Criterion / BFI / Arrow inspired)
  spine_number?: string | null;
  aspect_ratio?: string | null;
  audio_format?: string | null;
  director?: string | null;
  imdb_rating?: number | null;
  imdb_id?: string | null;
}

export interface CartItem {
  id: string;
  product_id: string;
  product: Product;
  quantity: number;
  unit_price: number;
}

export interface Address {
  id: string;
  user_id?: string;
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
  is_default?: boolean;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_title: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  cover_image_url?: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id?: string | null;
  email: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  fulfilment_status: FulfilmentStatus;
  subtotal: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  shipping_address: Address;
  payment_method?: PaymentMethodType;
  payment_provider?: PaymentProviderType;
  payment_reference?: string;
  paid_at?: string | null;
  payment_confirmed_by?: string | null;
  bank_transfer_reference?: string | null;
  paypal_order_id?: string | null;
  paypal_capture_id?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_checkout_session_id?: string | null;
  shipping_carrier?: string | null;
  tracking_number?: string | null;
  dispatched_at?: string | null;
  delivered_at?: string | null;
  internal_notes?: string | null;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Promotion {
  id: string;
  code: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  minimum_order: number;
  is_active: boolean;
  starts_at?: string;
  ends_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FinancialStats {
  settingsConfigured: boolean;
  totalRevenue: number;
  todayRevenue: number;
  totalOrders: number;
  todayOrders: number;
  averageOrderValue: number;
  lowStockCount: number;
  dailyRevenue: { date: string; amount: number; orders: number }[];
  recentOrders: Order[];
}

export interface StoreSettings {
  id: string;
  // Search & sharing identity
  seo_site_url: string;
  seo_site_title: string;
  seo_site_description: string;
  seo_social_image_url: string;
  seo_organization_description: string;

  // Hero Section
  hero_badge_text: string;
  hero_headline_line1: string;
  hero_headline_highlight: string;
  hero_subheadline: string;
  hero_cta_primary: string;
  hero_cta_secondary: string;
  hero_bg_image: string;

  // Announcement Bar
  announcement_left: string;
  announcement_center: string;
  announcement_link: string;

  // Flash Deal of the Day
  deal_product_id: string | null;
  deal_discount_price: number;
  deal_ends_at: string | null;
  deal_is_active: boolean;

  // Director / Curator Spotlight
  director_badge: string;
  director_name: string;
  director_quote: string;
  director_bio: string;
  director_product_ids: string[];

  // UK Logistics & Delivery
  free_shipping_threshold: number;
  standard_shipping_fee: number;
  express_shipping_fee: number;
  standard_shipping_name: string;
  standard_shipping_eta: string;
  express_shipping_name: string;
  express_shipping_eta: string;
  low_stock_threshold: number;
  budget_collection_threshold: number;
  dispatch_cutoff_time: string;

  // VIP Promotion
  vip_promo_code: string;
  vip_promo_discount: number;
  vip_min_spend: number;

  // Store Operations & Warehouse
  store_name: string;
  registered_company_name: string;
  company_number: string;
  registered_office_address: string;
  companies_house_url: string;
  warehouse_location: string;
  support_email: string;
  support_phone: string;
  // Company Bank Account (for manual bank transfer flow)
  bank_name?: string;
  bank_account_name?: string;
  bank_sort_code?: string;
  bank_account_number?: string;
  bank_iban?: string;
  bank_payment_instructions?: string;
  updated_at: string;
}

export * from './homepage';
