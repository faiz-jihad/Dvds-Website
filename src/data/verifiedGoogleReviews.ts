export interface VerifiedGoogleReview {
  id: string;
  author_name: string;
  author_photo_url?: string;
  rating: number; // 1 to 5
  text: string;
  relative_time_description?: string;
  review_date?: string; // e.g. "2024-03-15"
  source_url?: string;
}

/**
 * Authentic Customer Google Reviews for DVDs Zone
 *
 * COMPLIANCE & INTEGRITY RULES:
 * 1. ONLY genuine reviews from real customers who reviewed DVDs Zone on Google Business Profile.
 * 2. NEVER fabricate names, quotes, star ratings, or testimonials.
 * 3. Initialized as an empty array ([]) until genuine reviews are copied by the business owner from:
 *    https://g.page/r/CcbYihBj8jECEBM/review
 */
export const VERIFIED_GOOGLE_REVIEWS: VerifiedGoogleReview[] = [];
