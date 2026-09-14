export interface ImdbData {
  rating: number;
  imdbId?: string;
}

/** Customer-facing ratings come only from operational product metadata. */
export function getImdbData(product: {
  imdb_rating?: number | null;
  imdb_id?: string | null;
}): ImdbData | null {
  if (product.imdb_rating == null || product.imdb_rating <= 0) return null;
  return {
    rating: Number(product.imdb_rating.toFixed(1)),
    imdbId: product.imdb_id || undefined,
  };
}

export function getImdbRating(product: {
  imdb_rating?: number | null;
}): number | null {
  return getImdbData(product)?.rating ?? null;
}

export function getImdbUrl(product: {
  title: string;
  imdb_id?: string | null;
}): string {
  if (product.imdb_id) return `https://www.imdb.com/title/${product.imdb_id}/`;
  return `https://www.imdb.com/find/?q=${encodeURIComponent(product.title)}&s=tt`;
}
