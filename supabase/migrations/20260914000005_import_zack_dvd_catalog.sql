-- Import the photographed Zack DVD catalogue as operational drafts.
--
-- Content metadata was checked against the official programme/studio pages.
-- Price is intentionally zero and status is intentionally draft: the supplied
-- images do not establish a selling price, and disc region/subtitle details
-- are not legible for every item.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS spine_number TEXT,
  ADD COLUMN IF NOT EXISTS aspect_ratio TEXT,
  ADD COLUMN IF NOT EXISTS audio_format TEXT,
  ADD COLUMN IF NOT EXISTS director TEXT,
  ADD COLUMN IF NOT EXISTS imdb_rating NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS imdb_id TEXT;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_region_code_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_region_code_check CHECK (
    region_code IN (
      'Region 1',
      'Region 2',
      'Region 3',
      'Region 0 (All Region)',
      'Region A',
      'Region B',
      'Region C',
      'Region not verified'
    )
  );

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_active_price_required;

ALTER TABLE public.products
  ADD CONSTRAINT products_active_price_required
  CHECK (status <> 'active' OR price > 0);

INSERT INTO public.categories (name, slug, description, is_active, sort_order)
VALUES
  ('Film', 'film', 'Feature films on physical media.', TRUE, 10),
  ('TV Box Sets', 'tv-box-sets', 'Complete television seasons and multi-season collections.', TRUE, 20),
  ('Documentary & Music', 'documentary-music', 'Documentaries, concerts, music and reunion specials.', TRUE, 30)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.genres (name, slug)
VALUES
  ('Action', 'action'),
  ('Adventure', 'adventure'),
  ('Comedy', 'comedy'),
  ('Crime', 'crime'),
  ('Documentary', 'documentary'),
  ('Drama', 'drama'),
  ('Faith', 'faith'),
  ('Historical', 'historical'),
  ('Music', 'music'),
  ('Science Fiction', 'science-fiction'),
  ('War', 'war'),
  ('Western', 'western')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.products (
  sku,
  title,
  slug,
  description,
  short_description,
  category_id,
  format,
  release_year,
  runtime_minutes,
  age_rating,
  region_code,
  language,
  subtitles,
  condition,
  price,
  compare_at_price,
  stock_quantity,
  cover_image_url,
  status,
  is_featured,
  is_new_release,
  is_best_seller,
  aspect_ratio,
  audio_format,
  director,
  imdb_id
)
VALUES
  (
    'ZDV-TV-001',
    'Star Wars: The Book of Boba Fett - Season 1',
    'star-wars-the-book-of-boba-fett-season-1',
    'Boba Fett and Fennec Shand return to Tatooine to claim the territory once controlled by Jabba the Hutt. Complete seven-episode first season.',
    'The complete seven-episode Star Wars adventure.',
    (SELECT id FROM public.categories WHERE slug = 'tv-box-sets'),
    'Box Set', 2021, 336, '12', 'Region not verified', 'English', 'Not yet verified',
    'New', 0, NULL, 3, '/catalog/the-book-of-boba-fett-season-1.jpeg',
    'draft', FALSE, FALSE, FALSE, '16:9 Widescreen', 'Not yet verified',
    'Robert Rodriguez, Steph Green, Kevin Tancharoen, Bryce Dallas Howard, Dave Filoni, Jon Favreau',
    'tt13668894'
  ),
  (
    'ZDV-TV-002',
    'Dutton Ranch - Season 1',
    'dutton-ranch-season-1',
    'Beth Dutton and Rip Wheeler gamble on a new life in South Texas, where a rival ranch threatens the future they are trying to build. Complete nine-episode first season.',
    'Beth and Rip begin a new chapter in South Texas.',
    (SELECT id FROM public.categories WHERE slug = 'tv-box-sets'),
    'Box Set', 2026, 495, '15', 'Region not verified', 'English', 'Not yet verified',
    'New', 0, NULL, 1, '/catalog/dutton-ranch-season-1.svg',
    'draft', FALSE, TRUE, FALSE, '16:9 Widescreen', 'Not yet verified',
    'Christina Voros, Greg Yaitanes, Jessica Lowrey, Phil Abraham',
    'tt34991493'
  ),
  (
    'ZDV-TV-003',
    'Marshals - Season 1',
    'marshals-season-1',
    'Kayce Dutton joins an elite U.S. Marshals unit in Montana, balancing dangerous field work with family, duty and the cost of violence. Complete 13-episode first season.',
    'Luke Grimes returns as Kayce Dutton in the complete first season.',
    (SELECT id FROM public.categories WHERE slug = 'tv-box-sets'),
    'Box Set', 2026, 572, '15', 'Region not verified', 'English', 'Not yet verified',
    'New', 0, NULL, 1, '/catalog/marshals-season-1.jpeg',
    'draft', FALSE, TRUE, FALSE, '16:9 Widescreen', 'Not yet verified',
    'Various', 'tt36849871'
  ),
  (
    'ZDV-TV-004',
    'Star Wars: The Mandalorian - Seasons 1-3',
    'star-wars-the-mandalorian-seasons-1-3',
    'Din Djarin crosses the lawless reaches of the galaxy with his foundling Grogu. Collection of all 24 episodes from seasons one through three.',
    'All 24 episodes from the first three seasons.',
    (SELECT id FROM public.categories WHERE slug = 'tv-box-sets'),
    'Box Set', 2019, 1017, '12', 'Region not verified', 'English', 'Not yet verified',
    'New', 0, NULL, 1, '/catalog/the-mandalorian-seasons-1-3.jpeg',
    'draft', FALSE, FALSE, FALSE, '16:9 Widescreen', 'Not yet verified',
    'Various', 'tt8111088'
  ),
  (
    'ZDV-TV-005',
    'The Chosen - Seasons 1-3',
    'the-chosen-seasons-1-3',
    'A historical drama about the life of Jesus, seen through the people who knew him. Seasons one through three contain 24 episodes with a combined runtime of 1,322 minutes.',
    'The first three seasons in one 24-episode collection.',
    (SELECT id FROM public.categories WHERE slug = 'tv-box-sets'),
    'Box Set', 2019, 1322, '12', 'Region not verified', 'English, Spanish', 'English, Spanish',
    'New', 0, NULL, 1, '/catalog/the-chosen-seasons-1-3.jpeg',
    'draft', FALSE, FALSE, FALSE, '16:9 Anamorphic Widescreen', 'Dolby Digital 5.1 - English and Spanish',
    'Dallas Jenkins', 'tt9471404'
  ),
  (
    'ZDV-TV-006',
    'Star Wars: The Mandalorian - Seasons 1-2',
    'star-wars-the-mandalorian-seasons-1-2',
    'The first 16 chapters of Din Djarin and Grogu''s journey across the post-Empire galaxy, collecting seasons one and two.',
    'The complete first and second seasons.',
    (SELECT id FROM public.categories WHERE slug = 'tv-box-sets'),
    'Box Set', 2019, 678, '12', 'Region not verified', 'English', 'Not yet verified',
    'New', 0, NULL, 3, '/catalog/the-mandalorian-seasons-1-2.jpeg',
    'draft', FALSE, FALSE, FALSE, '16:9 Widescreen', 'Not yet verified',
    'Various', 'tt8111088'
  ),
  (
    'ZDV-FILM-001',
    'Greyhound',
    'greyhound-2020',
    'A first-time U.S. Navy captain leads an Allied convoy across the Atlantic while German U-boats close in during the Second World War.',
    'Tom Hanks leads a convoy through the Battle of the Atlantic.',
    (SELECT id FROM public.categories WHERE slug = 'film'),
    'DVD', 2020, 91, '12', 'Region not verified', 'English', 'Not yet verified',
    'New', 0, NULL, 1, '/catalog/greyhound.jpeg',
    'draft', FALSE, FALSE, FALSE, '2.39:1 Widescreen', 'Not yet verified',
    'Aaron Schneider', 'tt6048922'
  ),
  (
    'ZDV-TV-007',
    'SEAL Team - Season 5',
    'seal-team-season-5',
    'Bravo Team faces covert missions abroad and mounting pressure at home. Complete 14-episode fifth season.',
    'All 14 episodes from the fifth season.',
    (SELECT id FROM public.categories WHERE slug = 'tv-box-sets'),
    'Box Set', 2021, 629, '15', 'Region not verified', 'English', 'English SDH',
    'New', 0, NULL, 2, '/catalog/seal-team-season-5.jpeg',
    'draft', FALSE, FALSE, FALSE, '16:9 Widescreen', 'Dolby Digital 5.1',
    'Various', 'tt6473344'
  ),
  (
    'ZDV-DOC-001',
    'The Beatles: Get Back',
    'the-beatles-get-back',
    'Peter Jackson''s three-part documentary follows the Beatles during their January 1969 recording sessions and presents their final rooftop performance in full.',
    'The complete three-part documentary series directed by Peter Jackson.',
    (SELECT id FROM public.categories WHERE slug = 'documentary-music'),
    'Box Set', 2021, 468, '12', 'Region not verified', 'English', 'English SDH, Spanish, French',
    'New', 0, NULL, 1, '/catalog/the-beatles-get-back.svg',
    'draft', FALSE, FALSE, FALSE, '1.85:1', 'English Dolby Digital 5.1 and 2.0',
    'Peter Jackson', 'tt9735318'
  ),
  (
    'ZDV-TV-008',
    'Star Wars: The Mandalorian - Season 3',
    'star-wars-the-mandalorian-season-3',
    'Din Djarin seeks redemption while Bo-Katan works to reunite the scattered Mandalorians and reclaim their home world. Complete eight-episode third season.',
    'The complete eight-episode third season.',
    (SELECT id FROM public.categories WHERE slug = 'tv-box-sets'),
    'Box Set', 2023, 339, '12', 'Region not verified', 'English', 'Not yet verified',
    'New', 0, NULL, 1, '/catalog/the-mandalorian-season-3.jpeg',
    'draft', FALSE, FALSE, FALSE, '16:9 Widescreen', 'Not yet verified',
    'Rick Famuyiwa, Rachel Morrison, Lee Isaac Chung, Carl Weathers, Peter Ramsey, Bryce Dallas Howard',
    'tt8111088'
  ),
  (
    'ZDV-DOC-002',
    'Friends: The Reunion',
    'friends-the-reunion',
    'Jennifer Aniston, Courteney Cox, Lisa Kudrow, Matt LeBlanc, Matthew Perry and David Schwimmer reunite on the original sets to revisit the series.',
    'The original cast returns for the feature-length reunion special.',
    (SELECT id FROM public.categories WHERE slug = 'documentary-music'),
    'DVD', 2021, 104, '12', 'Region not verified', 'English', 'Not yet verified',
    'New', 0, NULL, 1, '/catalog/friends-the-reunion.jpeg',
    'draft', FALSE, FALSE, FALSE, '1.85:1; archive footage varies', 'Dolby Digital',
    'Ben Winston', 'tt11337862'
  )
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  category_id = EXCLUDED.category_id,
  format = EXCLUDED.format,
  release_year = EXCLUDED.release_year,
  runtime_minutes = EXCLUDED.runtime_minutes,
  age_rating = EXCLUDED.age_rating,
  cover_image_url = EXCLUDED.cover_image_url,
  aspect_ratio = EXCLUDED.aspect_ratio,
  audio_format = EXCLUDED.audio_format,
  director = EXCLUDED.director,
  imdb_id = EXCLUDED.imdb_id,
  updated_at = NOW();

WITH assignments(product_slug, genre_slug) AS (
  VALUES
    ('star-wars-the-book-of-boba-fett-season-1', 'action'),
    ('star-wars-the-book-of-boba-fett-season-1', 'adventure'),
    ('star-wars-the-book-of-boba-fett-season-1', 'science-fiction'),
    ('dutton-ranch-season-1', 'drama'),
    ('dutton-ranch-season-1', 'western'),
    ('marshals-season-1', 'action'),
    ('marshals-season-1', 'crime'),
    ('marshals-season-1', 'drama'),
    ('marshals-season-1', 'western'),
    ('star-wars-the-mandalorian-seasons-1-3', 'action'),
    ('star-wars-the-mandalorian-seasons-1-3', 'adventure'),
    ('star-wars-the-mandalorian-seasons-1-3', 'science-fiction'),
    ('the-chosen-seasons-1-3', 'drama'),
    ('the-chosen-seasons-1-3', 'faith'),
    ('the-chosen-seasons-1-3', 'historical'),
    ('star-wars-the-mandalorian-seasons-1-2', 'action'),
    ('star-wars-the-mandalorian-seasons-1-2', 'adventure'),
    ('star-wars-the-mandalorian-seasons-1-2', 'science-fiction'),
    ('greyhound-2020', 'action'),
    ('greyhound-2020', 'drama'),
    ('greyhound-2020', 'war'),
    ('seal-team-season-5', 'action'),
    ('seal-team-season-5', 'drama'),
    ('seal-team-season-5', 'war'),
    ('the-beatles-get-back', 'documentary'),
    ('the-beatles-get-back', 'music'),
    ('star-wars-the-mandalorian-season-3', 'action'),
    ('star-wars-the-mandalorian-season-3', 'adventure'),
    ('star-wars-the-mandalorian-season-3', 'science-fiction'),
    ('friends-the-reunion', 'comedy'),
    ('friends-the-reunion', 'documentary')
)
INSERT INTO public.product_genres(product_id, genre_id)
SELECT p.id, g.id
FROM assignments a
JOIN public.products p ON p.slug = a.product_slug
JOIN public.genres g ON g.slug = a.genre_slug
ON CONFLICT (product_id, genre_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
