import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
