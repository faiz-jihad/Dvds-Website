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
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
