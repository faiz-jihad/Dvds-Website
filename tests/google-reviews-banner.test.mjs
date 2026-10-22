import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = resolve(process.cwd());

test('1. GoogleReviewsBanner component file exists and exports correctly', () => {
  const filePath = resolve(rootDir, 'src/components/landing/GoogleReviewsBanner.tsx');
  assert.ok(existsSync(filePath), 'GoogleReviewsBanner.tsx must exist');

  const content = readFileSync(filePath, 'utf8');
  assert.ok(content.includes('export const GoogleReviewsBanner'), 'Must export GoogleReviewsBanner');
  assert.ok(content.includes('export const GoogleGLogo'), 'Must export GoogleGLogo');
  assert.ok(content.includes('export default GoogleReviewsBanner'), 'Must default export GoogleReviewsBanner');
});

test('2. Google branding uses authentic Google 4-color palette and correct attributes', () => {
  const content = readFileSync(resolve(rootDir, 'src/components/landing/GoogleReviewsBanner.tsx'), 'utf8');

  // Official Google G colors
  assert.ok(content.includes('#EA4335'), 'Must include Google Red (#EA4335)');
  assert.ok(content.includes('#4285F4'), 'Must include Google Blue (#4285F4)');
  assert.ok(content.includes('#FBBC05'), 'Must include Google Yellow (#FBBC05)');
  assert.ok(content.includes('#34A853'), 'Must include Google Green (#34A853)');

  // Clear accessible button text
  assert.ok(content.includes('Write a Google Review'), 'Must include "Write a Google Review" call to action');
});

test('3. Safe link attributes are enforced on outgoing review link', () => {
  const content = readFileSync(resolve(rootDir, 'src/components/landing/GoogleReviewsBanner.tsx'), 'utf8');

  assert.ok(content.includes('target="_blank"'), 'Outgoing link must open in new tab');
  assert.ok(content.includes('rel="noopener noreferrer"'), 'Outgoing link must include safe rel attributes');
});

test('4. Ratings, counts, and testimonials are NEVER fabricated', () => {
  const content = readFileSync(resolve(rootDir, 'src/components/landing/GoogleReviewsBanner.tsx'), 'utf8');

  // Must not have hardcoded star counts like 4.9 or 5.0 displayed unconditionally
  assert.ok(!content.includes("aria-label=\"5 stars on Google\""), 'Must NOT claim 5 stars unconditionally');
  assert.ok(!content.includes("4.9 / 5.0"), 'Must NOT fabricate 4.9 rating');
  assert.ok(!content.includes("5.0 / 5.0"), 'Must NOT fabricate 5.0 rating');

  // Rating display is gated strictly by hasVerifiedRating
  assert.ok(content.includes('hasVerifiedRating'), 'Must gate rating display with verification check');
});

test('5. Configurable review URL with safe fallback when unconfigured', () => {
  const content = readFileSync(resolve(rootDir, 'src/components/landing/GoogleReviewsBanner.tsx'), 'utf8');

  // Configurable via prop or env var
  assert.ok(content.includes('VITE_GOOGLE_REVIEW_URL'), 'Must check VITE_GOOGLE_REVIEW_URL');
  assert.ok(content.includes('reviewUrl'), 'Must accept reviewUrl prop');

  // When unconfigured, must NOT render a broken active link
  assert.ok(content.includes('disabled'), 'Must use disabled button when URL not configured');
  assert.ok(content.includes('isConfigured'), 'Must check isConfigured before rendering anchor link');
});

test('6. Homepage integration in AzDarkLandingLayout', () => {
  const content = readFileSync(resolve(rootDir, 'src/components/landing/AzDarkLandingLayout.tsx'), 'utf8');

  assert.ok(content.includes("import { GoogleReviewsBanner } from './GoogleReviewsBanner'"), 'AzDarkLandingLayout must import GoogleReviewsBanner');
  assert.ok(content.includes('<GoogleReviewsBanner reviewUrl={settings?.google_review_url}'), 'AzDarkLandingLayout must render GoogleReviewsBanner with settings');
});

test('7. Footer integration in AzDarkLandingFooter', () => {
  const content = readFileSync(resolve(rootDir, 'src/components/landing/AzDarkLandingFooter.tsx'), 'utf8');

  assert.ok(content.includes("import { GoogleReviewsBanner } from './GoogleReviewsBanner'"), 'AzDarkLandingFooter must import GoogleReviewsBanner');
  assert.ok(content.includes('variant="compact"'), 'AzDarkLandingFooter must use compact variant');
});

test('8. Types and default settings support google_review_url', () => {
  const typesContent = readFileSync(resolve(rootDir, 'src/types/index.ts'), 'utf8');
  assert.ok(typesContent.includes('google_review_url?: string'), 'StoreSettings interface must declare google_review_url');

  const defaultContent = readFileSync(resolve(rootDir, 'src/data/defaultStoreSettings.ts'), 'utf8');
  assert.ok(defaultContent.includes('google_review_url:'), 'DEFAULT_STORE_SETTINGS must include google_review_url');

  const envExample = readFileSync(resolve(rootDir, '.env.example'), 'utf8');
  assert.ok(envExample.includes('VITE_GOOGLE_REVIEW_URL='), '.env.example must document VITE_GOOGLE_REVIEW_URL');
});
