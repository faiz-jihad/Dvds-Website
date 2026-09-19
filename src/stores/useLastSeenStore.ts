import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '../types';

interface LastSeenState {
  lastSeenProducts: Product[];
  recordView: (product: Product) => void;
  clearLastSeen: () => void;
}

export const useLastSeenStore = create<LastSeenState>()(
  persist(
    (set) => ({
      lastSeenProducts: [],
      recordView: (product: Product) => {
        if (!product || !product.id) return;
        set((state) => {
          const remaining = state.lastSeenProducts.filter((p) => p.id !== product.id);
          return {
            lastSeenProducts: [product, ...remaining].slice(0, 10),
          };
        });
      },
      clearLastSeen: () => set({ lastSeenProducts: [] }),
    }),
    {
      name: 'az_rayan_last_seen_dvds_v1',
    }
  )
);
