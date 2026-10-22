import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = resolve(process.cwd());

test('1. searchEngine.ts contains brand query tolerance for "dvd zone" and "dvds zone"', () => {
  const code = readFileSync(resolve(rootDir, 'src/lib/searchEngine.ts'), 'utf8');
  assert.ok(code.includes("'dvd zone'"), "Must handle 'dvd zone'");
  assert.ok(code.includes("'dvds zone'"), "Must handle 'dvds zone'");
  assert.ok(code.includes("'dvd zone uk'"), "Must handle 'dvd zone uk'");
  assert.ok(code.includes('isBrandSearch'), "Must check isBrandSearch flag");
  assert.ok(code.includes('brand_catalogue_match'), "Must record brand_catalogue_match");
});

test('4. index.html primary title is optimized for "DVD Zone" and "DVD Zone UK"', () => {
  const indexHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf8');
  assert.ok(
    indexHtml.includes('<title>DVD Zone — DVD Zone UK | Buy Quality DVDs &amp; TV Box Sets Online | Free UK Delivery</title>'),
    'Title tag must start with "DVD Zone — DVD Zone UK"'
  );
});

test('5. index.html meta description, keywords, and OpenGraph include "DVD Zone"', () => {
  const indexHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('name="description" content="DVD Zone (DVD Zone UK)'), 'Meta description must start with DVD Zone');
  assert.ok(indexHtml.includes('name="keywords" content="DVD Zone, DVD Zone UK'), 'Meta keywords must start with DVD Zone');
  assert.ok(indexHtml.includes('property="og:title" content="DVD Zone — DVD Zone UK'), 'og:title must include DVD Zone');
});

test('6. index.html Schema.org WebSite, OnlineStore, and ItemList include "DVD Zone"', () => {
  const indexHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('"name": "DVD Zone"'), 'Schema must define name as "DVD Zone"');
  assert.ok(indexHtml.includes('"alternateName": ['), 'Schema must define alternateName array');
  assert.ok(indexHtml.includes('"DVDs Zone"'), 'alternateName must include "DVDs Zone"');
  assert.ok(indexHtml.includes('"@type": "ItemList"'), 'Schema must include ItemList for Google rich snippets');
});

test('7. index.html pre-rendered SSR HTML contains rich DVD Zone storefront and ReviewsWidget', () => {
  const indexHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('DVD Zone UK — Quality DVDs, TV Box Sets &amp; Entertainment'), 'H1 must include DVD Zone UK');
  assert.ok(indexHtml.includes('Welcome to <strong>DVD Zone</strong>'), 'Body text must describe DVD Zone');
  assert.ok(indexHtml.includes('data-reviewgrid="5f7dfa8a-15b8-47ea-9bb9-fe31c19cdcf7"'), 'Pre-rendered HTML must include ReviewsWidget container');
  assert.ok(indexHtml.includes('https://reviewswidget.app/embed.js'), 'index.html must include ReviewsWidget script');
});

test('8. GoogleReviews component has official ReviewsWidget container and embed script', () => {
  const comp = readFileSync(resolve(rootDir, 'src/components/landing/GoogleReviews.tsx'), 'utf8');
  assert.ok(comp.includes('data-reviewgrid'), 'GoogleReviews must render data-reviewgrid attribute');
  assert.ok(comp.includes('5f7dfa8a-15b8-47ea-9bb9-fe31c19cdcf7'), 'GoogleReviews must default to 5f7dfa8a-15b8-47ea-9bb9-fe31c19cdcf7');
  assert.ok(comp.includes('https://reviewswidget.app/embed.js'), 'GoogleReviews must reference ReviewsWidget embed script');
});
