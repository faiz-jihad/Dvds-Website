import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = resolve(process.cwd());

test('1. ElfsightGoogleReviews component file exists and exports correctly', () => {
  const filePath = resolve(rootDir, 'src/components/landing/ElfsightGoogleReviews.tsx');
  assert.ok(existsSync(filePath), 'ElfsightGoogleReviews.tsx must exist');

  const content = readFileSync(filePath, 'utf8');
  assert.ok(content.includes('export const ElfsightGoogleReviews'), 'Must export ElfsightGoogleReviews');
  assert.ok(content.includes('export const GoogleGLogo'), 'Must export GoogleGLogo');
  assert.ok(content.includes('export const DEFAULT_ELFSIGHT_APP_ID'), 'Must export DEFAULT_ELFSIGHT_APP_ID');
  assert.ok(content.includes('export const DEFAULT_GOOGLE_REVIEW_URL'), 'Must export DEFAULT_GOOGLE_REVIEW_URL');
  assert.ok(content.includes('export default ElfsightGoogleReviews'), 'Must default export ElfsightGoogleReviews');
});

test('2. Default Elfsight App ID and Google Review URL match verified values', () => {
  const content = readFileSync(resolve(rootDir, 'src/components/landing/ElfsightGoogleReviews.tsx'), 'utf8');

  // Exact ID provided by user
  assert.ok(
    content.includes('2cb5859b-9d80-46cf-b70f-f54b84bb69c0'),
    'Must define default Elfsight app ID: 2cb5859b-9d80-46cf-b70f-f54b84bb69c0'
  );

  // Exact Google Review URL provided by user
  assert.ok(
    content.includes('https://g.page/r/CcbYihBj8jECEBM/review'),
    'Must define default Google Review URL: https://g.page/r/CcbYihBj8jECEBM/review'
  );
});

test('3. Official Elfsight widget container class and lazy attributes are present', () => {
  const content = readFileSync(resolve(rootDir, 'src/components/landing/ElfsightGoogleReviews.tsx'), 'utf8');

  assert.ok(content.includes('elfsight-app-'), 'Must include elfsight-app- class prefix');
  assert.ok(content.includes('data-elfsight-app-lazy'), 'Must include data-elfsight-app-lazy attribute');
  assert.ok(content.includes('https://elfsightcdn.com/platform.js'), 'Must use official Elfsight CDN platform.js');
});

test('4. React SPA lifecycle: script deduplication and Eapps.initialize handling', () => {
  const content = readFileSync(resolve(rootDir, 'src/components/landing/ElfsightGoogleReviews.tsx'), 'utf8');

  // Prevents duplicate script tags
  assert.ok(
    content.includes('script[src*="elfsightcdn.com/platform.js"]'),
    'Must check if platform.js already exists before injecting'
  );

  // Calls Eapps.initialize() on mount / route change
  assert.ok(
    content.includes('Eapps.initialize'),
    'Must call Eapps.initialize() to trigger widget rendering on React SPA route change'
  );
});

test('5. Branding and accessible CTA with safe outgoing link attributes', () => {
  const content = readFileSync(resolve(rootDir, 'src/components/landing/ElfsightGoogleReviews.tsx'), 'utf8');

  // Concise heading
  assert.ok(content.includes('What Our Customers Say'), 'Must include "What Our Customers Say" heading');

  // Clear button label
  assert.ok(content.includes('Write a Google Review'), 'Must include "Write a Google Review" button label');

  // Safe external attributes
  assert.ok(content.includes('target="_blank"'), 'Review link must open in new tab');
  assert.ok(content.includes('rel="noopener noreferrer"'), 'Review link must use safe rel attributes');
});

test('6. Authenticity: No fabricated ratings, stars, or mock testimonials', () => {
  const content = readFileSync(resolve(rootDir, 'src/components/landing/ElfsightGoogleReviews.tsx'), 'utf8');

  assert.ok(!content.includes("aria-label=\"5 stars on Google\""), 'Must NOT fabricate 5 stars unconditionally');
  assert.ok(!content.includes("4.9 / 5.0"), 'Must NOT fabricate 4.9 rating');
  assert.ok(!content.includes("5.0 / 5.0"), 'Must NOT fabricate 5.0 rating');
});

test('7. Graceful degradation when offline or CDN fails', () => {
  const content = readFileSync(resolve(rootDir, 'src/components/landing/ElfsightGoogleReviews.tsx'), 'utf8');

  assert.ok(content.includes('loadError'), 'Must track load error state');
  assert.ok(content.includes('onerror'), 'Must attach onerror handler to platform script');
  assert.ok(content.includes('Customer Reviews on Google'), 'Must provide fallback customer review guidance');
});

test('8. index.html includes official platform.js script for optimal preloading', () => {
  const indexHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf8');
  assert.ok(
    indexHtml.includes('https://elfsightcdn.com/platform.js'),
    'index.html must include platform.js'
  );
});

test('9. Default store settings and .env.example declare review URL and widget ID', () => {
  const defaultSettings = readFileSync(resolve(rootDir, 'src/data/defaultStoreSettings.ts'), 'utf8');
  assert.ok(
    defaultSettings.includes('https://g.page/r/CcbYihBj8jECEBM/review'),
    'defaultStoreSettings must have official Google review URL'
  );
  assert.ok(
    defaultSettings.includes('2cb5859b-9d80-46cf-b70f-f54b84bb69c0'),
    'defaultStoreSettings must have official Elfsight app ID'
  );

  const envExample = readFileSync(resolve(rootDir, '.env.example'), 'utf8');
  assert.ok(
    envExample.includes('VITE_ELFSIGHT_APP_ID='),
    '.env.example must document VITE_ELFSIGHT_APP_ID'
  );
  assert.ok(
    envExample.includes('https://g.page/r/CcbYihBj8jECEBM/review'),
    '.env.example must include official review URL'
  );
});
