import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = resolve(process.cwd());

test('1. GoogleReviews component exists and exports correctly', () => {
  const filePath = resolve(rootDir, 'src/components/landing/GoogleReviews.tsx');
  assert.ok(existsSync(filePath), 'GoogleReviews.tsx must exist');

  const content = readFileSync(filePath, 'utf8');
  assert.ok(content.includes('export const GoogleReviews'), 'Must export GoogleReviews');
  assert.ok(content.includes('export const GoogleGLogo'), 'Must export GoogleGLogo');
  assert.ok(content.includes('export const DEFAULT_TRUSTMARY_SCRIPT_URL'), 'Must export DEFAULT_TRUSTMARY_SCRIPT_URL');
  assert.ok(content.includes('export const DEFAULT_TRUSTMARY_WIDGET_ID'), 'Must export DEFAULT_TRUSTMARY_WIDGET_ID');
  assert.ok(content.includes('export default GoogleReviews'), 'Must default export GoogleReviews');
});

test('2. Trustmary widget script URL and widget ID are accurately configured', () => {
  const content = readFileSync(resolve(rootDir, 'src/components/landing/GoogleReviews.tsx'), 'utf8');

  assert.ok(
    content.includes('https://widget.trustmary.com/5aO76ho2M'),
    'Must configure official Trustmary script URL: https://widget.trustmary.com/5aO76ho2M'
  );
  assert.ok(
    content.includes('5aO76ho2M'),
    'Must configure Trustmary widget ID: 5aO76ho2M'
  );
});

test('3. Safe script injection in useEffect prevents duplicate script tags', () => {
  const content = readFileSync(resolve(rootDir, 'src/components/landing/GoogleReviews.tsx'), 'utf8');

  // Must check for existing script before injecting
  assert.ok(content.includes('document.querySelector'), 'Must query document for existing script to prevent duplicates');
  assert.ok(content.includes('createElement(\'script\')'), 'Must create script element in useEffect');
  assert.ok(content.includes('script.async = true'), 'Must set async on script');
  assert.ok(content.includes('addEventListener'), 'Must attach load and error listeners');
  assert.ok(content.includes('removeEventListener'), 'Must clean up event listeners on unmount');
});

test('4. Official Trustmary in-page embed container attribute is rendered', () => {
  const content = readFileSync(resolve(rootDir, 'src/components/landing/GoogleReviews.tsx'), 'utf8');

  assert.ok(
    content.includes('data-trustmary-widget'),
    'Must include data-trustmary-widget attribute for Trustmary mounting'
  );
  assert.ok(
    content.includes('trustmary-widget'),
    'Must include trustmary-widget class name'
  );
});

test('5. Google branding uses authentic 4-color palette and safe external link', () => {
  const content = readFileSync(resolve(rootDir, 'src/components/landing/GoogleReviews.tsx'), 'utf8');

  assert.ok(content.includes('#EA4335'), 'Must include Google Red (#EA4335)');
  assert.ok(content.includes('#4285F4'), 'Must include Google Blue (#4285F4)');
  assert.ok(content.includes('#FBBC05'), 'Must include Google Yellow (#FBBC05)');
  assert.ok(content.includes('#34A853'), 'Must include Google Green (#34A853)');

  assert.ok(content.includes('target="_blank"'), 'Outgoing link must open in new tab');
  assert.ok(content.includes('rel="noopener noreferrer"'), 'Outgoing link must include safe rel attributes');
  assert.ok(content.includes('Write a Google Review'), 'Must include "Write a Google Review" call to action');
});

test('6. Loading skeleton and ad-blocker fallback states are handled', () => {
  const content = readFileSync(resolve(rootDir, 'src/components/landing/GoogleReviews.tsx'), 'utf8');

  assert.ok(content.includes("scriptStatus === 'loading'"), 'Must handle loading skeleton state');
  assert.ok(content.includes("scriptStatus === 'error'"), 'Must handle error / fallback state');
  assert.ok(content.includes('animate-pulse'), 'Must render skeleton loader while loading');
});

test('7. Homepage integration in AzDarkLandingLayout', () => {
  const layoutContent = readFileSync(resolve(rootDir, 'src/components/landing/AzDarkLandingLayout.tsx'), 'utf8');

  assert.ok(
    layoutContent.includes("import { GoogleReviews } from './GoogleReviews'"),
    'AzDarkLandingLayout must import GoogleReviews'
  );
  assert.ok(
    layoutContent.includes('<GoogleReviews reviewUrl={settings?.google_review_url}'),
    'AzDarkLandingLayout must render GoogleReviews with store settings'
  );
});

test('8. GoogleReviewsBanner integrates and re-exports GoogleReviews', () => {
  const bannerContent = readFileSync(resolve(rootDir, 'src/components/landing/GoogleReviewsBanner.tsx'), 'utf8');

  assert.ok(
    bannerContent.includes("import { GoogleReviews } from './GoogleReviews'"),
    'GoogleReviewsBanner must import GoogleReviews'
  );
  assert.ok(
    bannerContent.includes('export { CustomGoogleReviewsSection, GoogleReviews }') ||
      bannerContent.includes('export { GoogleReviews }'),
    'GoogleReviewsBanner must re-export GoogleReviews'
  );
  assert.ok(
    bannerContent.includes('<GoogleReviews'),
    'GoogleReviewsBanner must render GoogleReviews for section variant'
  );
});

test('9. Script is injected into document.head to prevent duplicate widget mounting', () => {
  const content = readFileSync(resolve(rootDir, 'src/components/landing/GoogleReviews.tsx'), 'utf8');

  assert.ok(
    content.includes('document.head.appendChild(script)'),
    'Must append script to document.head exclusively, preventing in-container duplicate rendering'
  );
  assert.ok(
    !content.includes('containerRef.current.appendChild(script)'),
    'Must NOT append script into containerRef to prevent duplicate widget renders'
  );
});

test('10. Official Google Business listing is exported and linked in bottom trust strip', () => {
  const content = readFileSync(resolve(rootDir, 'src/components/landing/GoogleReviews.tsx'), 'utf8');

  assert.ok(
    content.includes('DEFAULT_GOOGLE_BUSINESS_LISTING_URL'),
    'Must export DEFAULT_GOOGLE_BUSINESS_LISTING_URL'
  );
  assert.ok(
    content.includes('https://www.google.com/maps/place/DVDs+Zone/@52.4974437,-2.0284367,11z/data=!3m1!4b1!4m14!1m7!3m6!1s0x26822c24ea01d861:0x231f263108ad8c6!2sDVDs+Zone!8m2!3d52.4973492!4d-1.8636315!16s%2Fg%2F11zzy9h3bs'),
    'Must contain verified Google Business Listing URL'
  );
});

test('11. index.html includes official Trustmary widget script in document head', () => {
  const indexHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf8');

  assert.ok(
    indexHtml.includes('<script src="https://widget.trustmary.com/5aO76ho2M" async></script>'),
    'index.html head must include Trustmary widget script: https://widget.trustmary.com/5aO76ho2M'
  );
});

test('12. Delegated click listener routes Trustmary internal buttons to Google Review CTA', () => {
  const content = readFileSync(resolve(rootDir, 'src/components/landing/GoogleReviews.tsx'), 'utf8');

  assert.ok(
    content.includes('handleWidgetClick') || content.includes('form.trustmary.com'),
    'Must handle delegated clicks to intercept internal Trustmary buttons'
  );
  assert.ok(
    content.includes('window.open(resolvedReviewUrl'),
    'Must open resolvedReviewUrl when review button is clicked'
  );
});

