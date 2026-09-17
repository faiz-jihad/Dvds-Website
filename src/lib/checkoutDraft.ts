import { Address, PaymentMethodType } from '../types';

export interface CheckoutDraft {
  customerId?: string;
  email?: string;
  address?: Address;
  currency?: string;
  tier?: 'standard' | 'express';
  method?: PaymentMethodType;
  promo?: string;
  promoDraft?: string;
  selectedAddressId?: string;
  saveNewAddress?: boolean;
  internationalAcknowledged?: boolean;
  timestamp?: number;
}

const CHECKOUT_DRAFT_KEY = 'dvdszone_checkout_draft_v2';

/**
 * Loads the saved checkout draft from localStorage.
 * If customerId is provided and the draft belongs to a different customer, returns null.
 */
export function loadCheckoutDraft(customerId?: string): CheckoutDraft | null {
  try {
    const raw = localStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!raw) return null;
    const parsed: CheckoutDraft = JSON.parse(raw);

    // Discard drafts older than 7 days
    if (parsed.timestamp && Date.now() - parsed.timestamp > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(CHECKOUT_DRAFT_KEY);
      return null;
    }

    // If customerId is known and matches a different customer, discard
    if (customerId && parsed.customerId && parsed.customerId !== customerId) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Saves the current checkout draft to localStorage.
 */
export function saveCheckoutDraft(draft: CheckoutDraft): void {
  try {
    const data: CheckoutDraft = {
      ...draft,
      timestamp: Date.now(),
    };
    localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('[checkoutDraft] Failed to save draft to localStorage:', err);
  }
}

/**
 * Clears the saved checkout draft from localStorage (e.g. after successful order completion).
 */
export function clearCheckoutDraft(): void {
  try {
    localStorage.removeItem(CHECKOUT_DRAFT_KEY);
  } catch (err) {
    console.warn('[checkoutDraft] Failed to clear draft from localStorage:', err);
  }
}
