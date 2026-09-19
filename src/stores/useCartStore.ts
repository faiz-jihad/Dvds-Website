import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Product, Promotion, StoreSettings } from '../types';

interface CartState {
  items: CartItem[];
  appliedPromoCode: string | null;
  discountPercentage: number;
  fixedDiscount: number;
  freeShippingThreshold: number | null;
  standardShippingRate: number | null;
  availablePromotions: Promotion[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  applyPromo: (code: string) => { success: boolean; message: string };
  removePromo: () => void;
  setOperationalPricing: (threshold: number, shippingRate: number, promotions: Promotion[]) => void;
  syncCatalogue: (products: Product[], settings?: StoreSettings) => void;
  getSubtotal: () => number;
  getShippingFee: () => number;
  getDiscountAmount: () => number;
  getTotal: () => number;
  getItemCount: () => number;
  getFreeShippingProgress: () => { threshold: number; remaining: number; percentage: number };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [], appliedPromoCode: null, discountPercentage: 0, fixedDiscount: 0,
      freeShippingThreshold: null, standardShippingRate: null, availablePromotions: [],

      addItem: (product, quantity = 1) => set((state) => {
        const existing = state.items.find((item) => item.product_id === product.id);
        if (existing) return { items: state.items.map((item) => item.product_id === product.id ? { ...item, quantity: Math.min(product.stock_quantity, item.quantity + quantity) } : item) };
        const newItem: CartItem = { id: `ci-${crypto.randomUUID()}`, product_id: product.id, product, quantity: Math.min(product.stock_quantity, quantity), unit_price: product.price };
        return { items: [...state.items, newItem] };
      }),
      removeItem: (productId) => set((state) => ({ items: state.items.filter((item) => item.product_id !== productId) })),
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) return get().removeItem(productId);
        set((state) => ({ items: state.items.map((item) => item.product_id === productId ? { ...item, quantity: Math.min(item.product.stock_quantity, quantity) } : item) }));
      },
      clearCart: () => set({ items: [], appliedPromoCode: null, discountPercentage: 0, fixedDiscount: 0 }),
      setOperationalPricing: (threshold, shippingRate, promotions) => set((state) => {
        const current = state.appliedPromoCode
          ? promotions.find((promotion) => promotion.code.toUpperCase() === state.appliedPromoCode?.toUpperCase())
          : undefined;
        const subtotal = state.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
        const stillValid = current && (!current.starts_at || Date.parse(current.starts_at) <= Date.now())
          && (!current.ends_at || Date.parse(current.ends_at) >= Date.now())
          && subtotal >= Number(current.minimum_order);

        return {
          freeShippingThreshold: threshold,
          standardShippingRate: shippingRate,
          availablePromotions: promotions,
          appliedPromoCode: stillValid ? current.code : null,
          discountPercentage: stillValid && current.type === 'percentage' ? Number(current.value) : 0,
          fixedDiscount: stillValid && current.type === 'fixed_amount' ? Number(current.value) : 0,
        };
      }),
      syncCatalogue: (products) => set((state) => {
        const productsById = new Map(products.map((product) => [product.id, product]));
        return {
          items: state.items.flatMap((item) => {
            const product = productsById.get(item.product_id);
            if (!product || product.status !== 'active' || product.stock_quantity <= 0) return [];
            return [{ ...item, product, unit_price: product.price, quantity: Math.min(item.quantity, product.stock_quantity) }];
          }),
        };
      }),
      applyPromo: (code) => {
        const clean = code.trim().toUpperCase();
        const promotion = get().availablePromotions.find((item) => item.code.toUpperCase() === clean);
        if (!promotion) return { success: false, message: 'Promotion code is invalid or inactive' };
        const now = Date.now();
        if (promotion.starts_at && new Date(promotion.starts_at).getTime() > now) return { success: false, message: 'This promotion has not started yet' };
        if (promotion.ends_at && new Date(promotion.ends_at).getTime() < now) return { success: false, message: 'This promotion has expired' };
        if (get().getSubtotal() < promotion.minimum_order) return { success: false, message: `Minimum order for ${promotion.code} is £${promotion.minimum_order.toFixed(2)}` };
        set({ appliedPromoCode: promotion.code, discountPercentage: promotion.type === 'percentage' ? promotion.value : 0, fixedDiscount: promotion.type === 'fixed_amount' ? promotion.value : 0 });
        return { success: true, message: `${promotion.code} applied successfully` };
      },
      removePromo: () => set({ appliedPromoCode: null, discountPercentage: 0, fixedDiscount: 0 }),
      getSubtotal: () => get().items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0),
      getShippingFee: () => {
        const subtotal = get().getSubtotal();
        const { freeShippingThreshold, standardShippingRate } = get();
        if (subtotal === 0) return 0;
        if (freeShippingThreshold != null && freeShippingThreshold <= 0) return 0;
        if (standardShippingRate != null && standardShippingRate <= 0) return 0;
        if (freeShippingThreshold == null || standardShippingRate == null) return 0;
        return subtotal >= freeShippingThreshold ? 0 : standardShippingRate;
      },
      getDiscountAmount: () => {
        const subtotal = get().getSubtotal();
        const calculated = get().discountPercentage > 0 ? subtotal * get().discountPercentage / 100 : get().fixedDiscount;
        return Math.min(subtotal, Math.max(0, calculated));
      },
      getTotal: () => Math.max(0, get().getSubtotal() + get().getShippingFee() - get().getDiscountAmount()),
      getItemCount: () => get().items.reduce((count, item) => count + item.quantity, 0),
      getFreeShippingProgress: () => {
        const subtotal = get().getSubtotal();
        const threshold = get().freeShippingThreshold ?? 0;
        if (threshold <= 0) {
          return { threshold: 0, remaining: 0, percentage: 100 };
        }
        return {
          threshold,
          remaining: Math.round(Math.max(0, threshold - subtotal) * 100) / 100,
          percentage: Math.min(100, Math.round((subtotal / threshold) * 100)),
        };
      },
    }),
    {
      name: 'az_rayan_basket_storage',
      partialize: (state) => ({ items: state.items, appliedPromoCode: state.appliedPromoCode, discountPercentage: state.discountPercentage, fixedDiscount: state.fixedDiscount }),
    }
  )
);
