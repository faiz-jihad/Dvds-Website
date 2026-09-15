import { Category } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'c-tv-box-sets',
    name: 'TV Box Sets',
    slug: 'tv-box-sets',
    description: 'Complete television seasons and multi-season box sets.',
    image_url: '/catalog/the-mandalorian-seasons-1-3.jpeg',
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'c-film',
    name: 'Film & Cinema',
    slug: 'film',
    description: 'Definitive film editions, restorations, and complete cinema sagas.',
    image_url: '/catalog/indiana-jones-4-movie-collection.jpeg',
    is_active: true,
    sort_order: 2,
  },
  {
    id: 'c-documentary-music',
    name: 'Documentary & Music',
    slug: 'documentary-music',
    description: 'Music archives, cultural documentaries, and landmark concert films.',
    image_url: '/catalog/the-beatles-get-back-collector-dvd.jpeg',
    is_active: true,
    sort_order: 3,
  },
];
