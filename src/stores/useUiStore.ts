import { create } from 'zustand';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface UiState {
  isCartDrawerOpen: boolean;
  isSearchOpen: boolean;
  isMobileNavOpen: boolean;
  toasts: ToastMessage[];

  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  toggleCartDrawer: () => void;

  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;

  openMobileNav: () => void;
  closeMobileNav: () => void;

  addToast: (message: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;
}

// Internal cache to deduplicate identical toasts fired in rapid succession
const recentToasts = new Map<string, number>();

export const useUiStore = create<UiState>((set) => ({
  isCartDrawerOpen: false,
  isSearchOpen: false,
  isMobileNavOpen: false,
  toasts: [],

  openCartDrawer: () => set({ isCartDrawerOpen: true }),
  closeCartDrawer: () => set({ isCartDrawerOpen: false }),
  toggleCartDrawer: () => set((s) => ({ isCartDrawerOpen: !s.isCartDrawerOpen })),

  openSearch: () => set({ isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false }),
  toggleSearch: () => set((s) => ({ isSearchOpen: !s.isSearchOpen })),

  openMobileNav: () => set({ isMobileNavOpen: true }),
  closeMobileNav: () => set({ isMobileNavOpen: false }),

  addToast: (message, type = 'success') => {
    const trimmed = (message || '').trim();
    if (!trimmed) return;

    const now = Date.now();
    const lastSeen = recentToasts.get(trimmed);
    if (lastSeen && now - lastSeen < 2500) {
      // Ignore duplicate toast within 2.5 seconds
      return;
    }
    recentToasts.set(trimmed, now);

    // Garbage-collect old deduplication cache entries
    if (recentToasts.size > 25) {
      for (const [key, timestamp] of recentToasts.entries()) {
        if (now - timestamp > 10000) recentToasts.delete(key);
      }
    }

    const id = `toast-${now}-${Math.random().toString(36).substring(2, 6)}`;
    set((s) => {
      // Keep at most 2 previous toasts + 1 new toast (max 3 on screen)
      const capped = s.toasts.slice(-2);
      return { toasts: [...capped, { id, type, message: trimmed }] };
    });

    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
