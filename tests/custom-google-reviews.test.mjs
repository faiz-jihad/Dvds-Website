import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = resolve(process.cwd());

test('1. CustomGoogleReviewsSection component file exists and exports correctly', () => {
  const filePath = resolve(rootDir, 'src/components/landing/CustomGoogleReviewsSection.tsx');
  assert.ok(existsSync(filePath), 'CustomGoogleReviewsSection.tsx must exist');

  const content = readFileSync(filePath, 'utf8');
  assert.ok(content.includes('export const CustomGoogleReviewsSection'), 'Must export CustomGoogleReviewsSection');
  assert.ok(content.includes('export const GoogleGLogo'), 'Must export GoogleGLogo');
  assert.ok(content.includes('export const DEFAULT_GOOGLE_REVIEW_URL'), 'Must export DEFAULT_GOOGLE_REVIEW_URL');
  assert.ok(content.includes('export const VERIFIED_PLACE_ID'), 'Must export VERIFIED_PLACE_ID');
  assert.ok(content.includes('export default CustomGoogleReviewsSection'), 'Must default export CustomGoogleReviewsSection');
});

test('2. Google branding uses authentic Google 4-color palette and verified review link', () => {
  const content = readFileSync(resolve(rootDir, 'src/components/landing/CustomGoogleReviewsSection.tsx'), 'utf8');

  // Official Google G colors
  assert.ok(content.includes('#EA4335'), 'Must include Google Red (#EA4335)');
  assert.ok(content.includes('#4285F4'), 'Must include Google Blue (#4285F4)');
  assert.ok(content.includes('#FBBC05'), 'Must include Google Yellow (#FBBC05)');
  assert.ok(content.includes('#34A853'), 'Must include Google Green (#34A853)');

  // Clear accessible button and URL
  assert.ok(content.includes('Write a Google Review'), 'Must include "Write a Google Review" call to action');
  assert.ok(
    content.includes('https://g.page/r/CcbYihBj8jECEBM/review'),
    'Must define verified Google Review URL: https://g.page/r/CcbYihBj8jECEBM/review'
  );
});

test('3. Safe link attributes are enforced on outgoing review link', () => {
  const content = readFileSync(resolve(rootDir, 'src/components/landing/CustomGoogleReviewsSection.tsx'), 'utf8');

  assert.ok(content.includes('target="_blank"'), 'Outgoing link must open in new tab');
  assert.ok(content.includes('rel="noopener noreferrer"'), 'Outgoing link must include safe rel attributes');
});

test('4. Zero third-party widget scripts: no Elfsight or external subscription dependencies', () => {
  const indexHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf8');
  assert.ok(
    !indexHtml.includes('elfsightcdn.com'),
    'index.html must NOT load third-party Elfsight platform script'
  );

  const componentContent = readFileSync(
    resolve(rootDir, 'src/components/landing/CustomGoogleReviewsSection.tsx'),
    'utf8'
  );
  assert.ok(
    !componentContent.includes('elfsightcdn.com'),
    'CustomGoogleReviewsSection must NOT depend on third-party Elfsight script'
  );
  assert.ok(
    !componentContent.includes('wewidget'),
    'CustomGoogleReviewsSection must NOT depend on third-party WeWidget'
  );
});

test('5. Authenticity: Empty state does NOT fabricate stars, counts, or testimonials', () => {
  const content = readFileSync(resolve(rootDir, 'src/components/landing/CustomGoogleReviewsSection.tsx'), 'utf8');

  // Must not have hardcoded star counts like 4.9 or 5.0 displayed unconditionally
  assert.ok(!content.includes("aria-label=\"5 stars on Google\""), 'Must NOT claim 5 stars unconditionally');
  assert.ok(!content.includes("4.9 / 5.0"), 'Must NOT fabricate 4.9 rating');
  assert.ok(!content.includes("5.0 / 5.0"), 'Must NOT fabricate 5.0 rating');

  // Must have hasReviews gating check
  assert.ok(content.includes('hasReviews'), 'Must gate review list and average rating with hasReviews');
});

test('6. Verified reviews data file exists and is initialized empty for authenticity', () => {
  const dataPath = resolve(rootDir, 'src/data/verifiedGoogleReviews.ts');
  assert.ok(existsSync(dataPath), 'verifiedGoogleReviews.ts must exist');

  const content = readFileSync(dataPath, 'utf8');
  assert.ok(content.includes('export const VERIFIED_GOOGLE_REVIEWS'), 'Must export VERIFIED_GOOGLE_REVIEWS');
  assert.ok(content.includes('VERIFIED_GOOGLE_REVIEWS: VerifiedGoogleReview[] = []'), 'Must initialize empty [] to prevent fake reviews');
});

test('7. Required section title "What Our Customers Say" is present', () => {
  const content = readFileSync(resolve(rootDir, 'src/components/landing/CustomGoogleReviewsSection.tsx'), 'utf8');
  assert.ok(
    content.includes('What Our Customers Say'),
    'Must include required section heading "What Our Customers Say"'
  );
});

test('8. GoogleReviewsBanner delegates section variant to CustomGoogleReviewsSection', () => {
  const bannerContent = readFileSync(resolve(rootDir, 'src/components/landing/GoogleReviewsBanner.tsx'), 'utf8');
  assert.ok(
    bannerContent.includes('CustomGoogleReviewsSection'),
    'GoogleReviewsBanner must import and render CustomGoogleReviewsSection'
  );
});

test('9. Backend Google Places API proxy exists and keeps secrets on server', () => {
  const apiPath = resolve(rootDir, 'api/google-reviews.js');
  assert.ok(existsSync(apiPath), 'api/google-reviews.js must exist');

  const apiContent = readFileSync(apiPath, 'utf8');
  assert.ok(apiContent.includes('GOOGLE_PLACES_API_KEY'), 'Must read GOOGLE_PLACES_API_KEY from server environment');
  assert.ok(!apiContent.includes('VITE_'), 'Must NOT use VITE_ prefix on backend server secret');
  assert.ok(apiContent.includes('ChIJYdgB6iQsgiYRxtiKEGPyMQI'), 'Must define verified Place ID ChIJYdgB6iQsgiYRxtiKEGPyMQI');
});

test('10. Client queries /api/google-reviews endpoint without exposing private API keys', () => {
  const componentContent = readFileSync(
    resolve(rootDir, 'src/components/landing/CustomGoogleReviewsSection.tsx'),
    'utf8'
  );
  assert.ok(componentContent.includes('/api/google-reviews'), 'Must call /api/google-reviews endpoint');
  assert.ok(
    !componentContent.includes('process.env.GOOGLE_PLACES_API_KEY'),
    'Client component must NOT access process.env.GOOGLE_PLACES_API_KEY directly'
  );
  assert.ok(
    !componentContent.includes('VITE_GOOGLE_PLACES_API_KEY'),
    'Must NOT expose secret key via frontend VITE_ variable'
  );
});
