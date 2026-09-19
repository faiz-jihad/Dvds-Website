import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '../lib/publicApi';
import { Product } from '../types';

interface FavouritesState {
  favourites: string[];
  toggleFavourite: (productId: string) => boolean;
  isFavourite: (productId: string) => boolean;
  loadFavourites: () => void;
}

export const useFavouritesStore = create<FavouritesState>()(
  persist(
    (set, get) => ({
      favourites: [],
      loadFavourites: () => undefined,
      toggleFavourite: (productId) => {
        const isNowFavourite = !get().favourites.includes(productId);
        set((state) => ({
          favourites: isNowFavourite
            ? [...state.favourites, productId]
            : state.favourites.filter((id) => id !== productId),
        }));
        return isNowFavourite;
      },
      isFavourite: (productId) => get().favourites.includes(productId),
    }),
    { name: 'az_rayan_favourites_v1' },
  ),
);

/**
 * Custom hook to retrieve the count of saved favourites that are currently ACTIVE.
 * Inactive, draft, or archived products are automatically excluded from the count.
 */
export function useActiveFavouritesCount(products?: Product[]): number {
  const favourites = useFavouritesStore((s) => s.favourites);
  const productsQuery = useQuery({
    queryKey: ['store', 'products'],
    queryFn: () => publicApi.getProducts(),
    staleTime: 30_000,
    enabled: !products || products.length === 0,
  });

  const productList = products && products.length > 0 ? products : productsQuery.data;
  if (!productList || productList.length === 0) {
    return 0;
  }

  const activeIds = new Set(
    productList
      .filter((p) => p.status === 'active')
      .map((p) => p.id)
  );

  return favourites.filter((id) => activeIds.has(id)).length;
}

