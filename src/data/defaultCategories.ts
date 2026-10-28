import { Category } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'c-tv-box-sets',
    name: 'TV Box Sets',
    slug: 'tv-box-sets',
    description: 'Shop complete television series, multi-season anthology box sets, and collector editions on Region 2 UK DVD with free tracked Royal Mail delivery.',
    introCopy: 'Explore our curated archive of complete television series and multi-disc collector box sets. From epic sci-fi sagas like Star Wars: The Mandalorian to frontier dramas and tactical military series, every box set is supplied in genuine UK-compatible packaging with same-day Royal Mail dispatch.',
    image_url: '/catalog/the-mandalorian-seasons-1-3.jpeg',
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'c-film',
    name: 'Film & Cinema',
    slug: 'film',
    description: 'Buy theatrical feature films, wartime cinema, and modern blockbusters on physical DVD at DVDs Zone UK with 100% free UK delivery.',
    introCopy: 'Browse our theatrical cinema catalogue featuring acclaimed feature films, World War II naval thrillers, and contemporary screen classics. Every DVD release is inspected for collector quality and dispatched from our UK warehouse with free Royal Mail delivery.',
    image_url: '/catalog/greyhound.jpeg',
    is_active: true,
    sort_order: 2,
  },
  {
    id: 'c-documentary-music',
    name: 'Documentary & Music',
    slug: 'documentary-music',
    description: 'Discover music documentaries, historic studio sessions, and television reunion specials on physical DVD with free UK shipping at DVDs Zone.',
    introCopy: 'Own definitive music documentaries, studio archive recordings, and landmark television specials on physical media. Featuring multi-disc collector editions such as Peter Jackson’s The Beatles: Get Back and Friends: The Reunion.',
    image_url: '/catalog/the-beatles-get-back.jpeg',
    is_active: true,
    sort_order: 3,
  },
];
