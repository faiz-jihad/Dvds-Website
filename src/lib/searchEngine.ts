import { Product } from '../types';

export interface SearchResultItem {
  product: Product;
  score: number;
  matchedFields: string[];
}

export interface SearchOptions {
  category?: string;
  format?: string;
  genre?: string;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating_desc' | 'newest';
  maxResults?: number;
}

/**
 * Normalises text for resilient search comparisons:
 * Lowercases, strips punctuation, and collapses multiple whitespaces.
 */
export function normalizeSearchTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Simple Levenshtein distance for fuzzy typo tolerance (e.g., "oppenhiemer" -> "oppenheimer")
 */
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Intelligent Scoring Search Engine for Physical Media Catalogues.
 * Evaluates titles, descriptions, genres, formats, release years, and SKUs
 * with typo tolerance and relevance ranking.
 */
export function searchCatalogue(
  products: Product[],
  rawQuery: string,
  options: SearchOptions = {}
): Product[] {
  const query = normalizeSearchTerm(rawQuery);
  if (!query) {
    let list = [...products];
    if (options.category && options.category !== 'all') {
      list = list.filter((p) => p.category?.slug === options.category || p.category_id === options.category);
    }
    if (options.format && options.format !== 'all') {
      list = list.filter((p) => p.format.toLowerCase().includes(options.format!.toLowerCase()));
    }
    return sortSearchResults(list, options.sortBy || 'newest');
  }

  const queryWords = query.split(' ').filter((w) => w.length > 0);
  const collapsedQuery = query.replace(/\s+/g, '');

  const scored: SearchResultItem[] = [];

  for (const product of products) {
    // 1. Filter by category if requested
    if (options.category && options.category !== 'all') {
      const matchCat =
        product.category?.slug === options.category ||
        product.category?.name.toLowerCase() === options.category.toLowerCase() ||
        product.category_id === options.category;
      if (!matchCat) continue;
    }

    // 2. Filter by format if requested
    if (options.format && options.format !== 'all') {
      if (!product.format.toLowerCase().includes(options.format.toLowerCase())) {
        continue;
      }
    }

    // 3. Filter by genre if requested
    if (options.genre && options.genre !== 'all') {
      const hasGenre = product.genres?.some(
        (g) => g.slug === options.genre || g.name.toLowerCase() === options.genre!.toLowerCase()
      );
      if (!hasGenre) continue;
    }

    // Prepare searchable strings
    const titleNorm = normalizeSearchTerm(product.title);
    const titleCollapsed = titleNorm.replace(/\s+/g, '');
    const descNorm = normalizeSearchTerm(product.description || '');
    const formatNorm = normalizeSearchTerm(product.format || '');
    const skuNorm = normalizeSearchTerm(product.sku || '');
    const genresList = (product.genres || []).map((g) => normalizeSearchTerm(g.name));
    const yearStr = product.release_year ? String(product.release_year) : '';

    let score = 0;
    const matchedFields: string[] = [];

    // --- A. Exact Phrase Title Match ---
    if (titleNorm === query) {
      score += 120;
      matchedFields.push('title_exact');
    } else if (titleNorm.startsWith(query)) {
      score += 90;
      matchedFields.push('title_prefix');
    } else if (titleNorm.includes(query)) {
      score += 70;
      matchedFields.push('title_contains');
    } else if (titleCollapsed.includes(collapsedQuery) && collapsedQuery.length >= 4) {
      // Handles queries without spaces e.g. "starwars" -> "star wars"
      score += 65;
      matchedFields.push('title_collapsed');
    }

    // --- B. Word-by-Word Matching in Title ---
    let titleWordsMatched = 0;
    for (const word of queryWords) {
      if (titleNorm.includes(word)) {
        titleWordsMatched++;
        score += 25;
      }
    }
    if (titleWordsMatched === queryWords.length && queryWords.length > 1) {
      // Bonus: All words found in title
      score += 30;
      matchedFields.push('title_all_words');
    }

    // --- C. Genre & Taxonomy Matches ---
    for (const genre of genresList) {
      if (genre.includes(query)) {
        score += 45;
        matchedFields.push('genre');
      } else {
        for (const word of queryWords) {
          if (genre.includes(word)) {
            score += 15;
          }
        }
      }
    }

    // --- D. Format Match (e.g., "4K", "DVD", "Box Set", "Blu-ray") ---
    if (formatNorm.includes(query)) {
      score += 40;
      matchedFields.push('format');
    } else {
      for (const word of queryWords) {
        if (word.length >= 3 && formatNorm.includes(word)) {
          score += 15;
        }
      }
    }

    // --- E. SKU & Catalogue Code Match ---
    if (skuNorm.includes(query)) {
      score += 50;
      matchedFields.push('sku');
    }

    // --- F. Release Year Match (e.g., "1994", "2023") ---
    if (yearStr && (yearStr === query || query.includes(yearStr))) {
      score += 30;
      matchedFields.push('year');
    }

    // --- G. Description Match (Lower weight) ---
    if (descNorm.includes(query)) {
      score += 20;
      matchedFields.push('description');
    } else {
      for (const word of queryWords) {
        if (word.length >= 4 && descNorm.includes(word)) {
          score += 5;
        }
      }
    }

    // --- H. Typo Tolerance / Fuzzy Match (for queries >= 4 chars) ---
    if (score === 0 && query.length >= 4) {
      const titleTokens = titleNorm.split(' ');
      for (const tToken of titleTokens) {
        if (Math.abs(tToken.length - query.length) <= 2) {
          const dist = levenshteinDistance(tToken, query);
          if (dist <= 2) {
            score += 35 - dist * 10;
            matchedFields.push('fuzzy_title');
            break;
          }
        }
      }
    }

    if (score > 0) {
      scored.push({ product, score, matchedFields });
    }
  }

  // Sort primarily by relevance score descending
  scored.sort((a, b) => b.score - a.score);

  const matchedProducts = scored.map((s) => s.product);

  // Apply secondary custom sorting if user selected sort option other than relevance
  if (options.sortBy && options.sortBy !== 'relevance') {
    return sortSearchResults(matchedProducts, options.sortBy);
  }

  if (options.maxResults && options.maxResults > 0) {
    return matchedProducts.slice(0, options.maxResults);
  }

  return matchedProducts;
}

/**
 * Intelligent "Did you mean?" title suggestion finder
 */
export function findSearchSuggestion(products: Product[], rawQuery: string): string | null {
  const q = normalizeSearchTerm(rawQuery);
  if (!q || q.length < 3) return null;

  let bestSuggestion: string | null = null;
  let bestDistance = Infinity;

  for (const p of products) {
    const titleNorm = normalizeSearchTerm(p.title);
    if (titleNorm === q) return null; // exact match already exists

    // Compare whole title
    const fullDist = levenshteinDistance(titleNorm, q);
    if (fullDist < bestDistance && fullDist <= 3) {
      bestDistance = fullDist;
      bestSuggestion = p.title;
    }

    // Compare individual tokens
    const tokens = titleNorm.split(' ');
    for (const tok of tokens) {
      if (tok.length >= 3) {
        const d = levenshteinDistance(tok, q);
        if (d < bestDistance && d <= 2) {
          bestDistance = d;
          bestSuggestion = p.title;
        }
      }
    }
  }

  return bestSuggestion;
}

/**
 * Sorter for search results based on user preference
 */
export function sortSearchResults(
  products: Product[],
  sortBy: NonNullable<SearchOptions['sortBy']>
): Product[] {
  const list = [...products];
  switch (sortBy) {
    case 'price_asc':
      return list.sort((a, b) => Number(a.price) - Number(b.price));
    case 'price_desc':
      return list.sort((a, b) => Number(b.price) - Number(a.price));
    case 'rating_desc':
      return list.sort((a, b) => (Number(b.imdb_rating) || 0) - (Number(a.imdb_rating) || 0));
    case 'newest':
      return list.sort((a, b) => (b.release_year || 0) - (a.release_year || 0));
    case 'relevance':
    default:
      return list;
  }
}
