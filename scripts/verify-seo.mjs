import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = resolve(process.cwd());
let passCount = 0;
let failCount = 0;

function runCheck(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    failCount++;
  }
}

// 1. Check searchEngine.ts brand variations
runCheck('1. searchEngine.ts BRAND_QUERIES includes DVDs Zone, dvdzone, and AZ Rayan variations', () => {
  const code = readFileSync(resolve(rootDir, 'src/lib/searchEngine.ts'), 'utf8');
  assert.ok(code.includes("'dvd zone'"), "Must handle 'dvd zone'");
  assert.ok(code.includes("'dvds zone'"), "Must handle 'dvds zone'");
  assert.ok(code.includes("'dvdzone'"), "Must handle 'dvdzone'");
  assert.ok(code.includes("'dvdszone'"), "Must handle 'dvdszone'");
  assert.ok(code.includes("'az rayan dvds'"), "Must handle 'az rayan dvds'");
  assert.ok(code.includes("'dvds-zone.co.uk'"), "Must handle 'dvds-zone.co.uk'");
  assert.ok(code.includes('isBrandSearch'), 'Must check isBrandSearch flag');
  assert.ok(code.includes('brand_catalogue_match'), 'Must record brand_catalogue_match');
});

// 2. Check index.html primary title
runCheck('2. index.html primary title is optimized for DVDs Zone', () => {
  const indexHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf8');
  assert.ok(
    indexHtml.includes('<title>DVDs Zone | DVD Movies &amp; TV Box Sets UK</title>'),
    'Title tag must match DVDs Zone | DVD Movies & TV Box Sets UK'
  );
});

// 3. Check index.html meta description, canonical, OpenGraph, Twitter
runCheck('3. index.html meta description, OpenGraph, and Twitter cards use DVDs Zone', () => {
  const indexHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf8');
  assert.ok(
    indexHtml.includes('name="description" content="Shop DVDs and TV box sets at DVDs Zone. Explore our collection of physical entertainment releases with UK delivery options."'),
    'Meta description must match production guideline'
  );
  assert.ok(indexHtml.includes('property="og:title" content="DVDs Zone | DVD Movies &amp; TV Box Sets UK"'), 'og:title must match DVDs Zone');
  assert.ok(indexHtml.includes('property="og:site_name" content="DVDs Zone"'), 'og:site_name must match DVDs Zone');
  assert.ok(indexHtml.includes('property="og:url" content="https://dvds-zone.co.uk/"'), 'og:url must be canonical https://dvds-zone.co.uk/');
  assert.ok(indexHtml.includes('name="twitter:card" content="summary_large_image"'), 'twitter:card must be summary_large_image');
  assert.ok(indexHtml.includes('rel="canonical" href="https://dvds-zone.co.uk/"'), 'canonical link must be https://dvds-zone.co.uk/');
});

// 4. Check index.html Schema.org JSON-LD
runCheck('4. index.html Schema.org contains Brand, WebSite, OnlineStore with DVDs Zone & AZRAYAN LTD', () => {
  const indexHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('"@type": "WebSite"'), 'Schema must define WebSite');
  assert.ok(indexHtml.includes('"@type": "OnlineStore"'), 'Schema must define OnlineStore');
  assert.ok(indexHtml.includes('"@type": "Brand"'), 'Schema must define Brand');
  assert.ok(indexHtml.includes('"name": "DVDs Zone"'), 'Schema must define name as "DVDs Zone"');
  assert.ok(indexHtml.includes('"dvdzone"'), 'alternateName must include "dvdzone"');
  assert.ok(indexHtml.includes('"dvd zone"'), 'alternateName must include "dvd zone"');
  assert.ok(indexHtml.includes('"AZ Rayan DVDs"'), 'alternateName must include "AZ Rayan DVDs"');
  assert.ok(indexHtml.includes('"dvds-zone.co.uk"'), 'alternateName must include "dvds-zone.co.uk"');
  assert.ok(indexHtml.includes('"AZRAYAN LTD"'), 'Schema must reference verified company AZRAYAN LTD');
});

// 5. Check index.html pre-rendered crawlable HTML
runCheck('5. index.html pre-rendered crawlable HTML contains semantic headings, anchors, and DVDs Zone', () => {
  const indexHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('DVDs Zone — DVD Movies &amp; TV Box Sets UK'), 'H1 must include DVDs Zone');
  assert.ok(indexHtml.includes('href="/shop"'), 'Must have crawlable link to /shop');
  assert.ok(indexHtml.includes('href="/product/star-wars-the-mandalorian-seasons-1-3"'), 'Must have crawlable link to active product');
});

// 6. Check public/robots.txt
runCheck('6. public/robots.txt contains appropriate allow/disallow directives and sitemap reference', () => {
  const robotsTxt = readFileSync(resolve(rootDir, 'public/robots.txt'), 'utf8');
  assert.ok(robotsTxt.includes('User-agent: *'), 'Must specify User-agent: *');
  assert.ok(robotsTxt.includes('Allow: /'), 'Must allow root');
  assert.ok(robotsTxt.includes('Disallow: /admin'), 'Must disallow /admin');
  assert.ok(robotsTxt.includes('Disallow: /checkout'), 'Must disallow /checkout');
  assert.ok(robotsTxt.includes('Disallow: /cart'), 'Must disallow /cart');
  assert.ok(robotsTxt.includes('Disallow: /search'), 'Must disallow /search');
  assert.ok(robotsTxt.includes('Disallow: /api/'), 'Must disallow /api/');
  assert.ok(robotsTxt.includes('Sitemap: https://dvds-zone.co.uk/sitemap.xml'), 'Must reference canonical sitemap');
});

// 7. Check public/sitemap.xml
runCheck('7. public/sitemap.xml contains valid canonical URLs and active catalog', () => {
  const sitemapXml = readFileSync(resolve(rootDir, 'public/sitemap.xml'), 'utf8');
  assert.ok(sitemapXml.includes('<loc>https://dvds-zone.co.uk/</loc>'), 'Must include homepage');
  assert.ok(sitemapXml.includes('<loc>https://dvds-zone.co.uk/shop</loc>'), 'Must include shop');
  assert.ok(sitemapXml.includes('<loc>https://dvds-zone.co.uk/shop?category=tv-box-sets</loc>'), 'Must include tv-box-sets');
  assert.ok(sitemapXml.includes('<loc>https://dvds-zone.co.uk/product/star-wars-the-mandalorian-seasons-1-3</loc>'), 'Must include real product');
  assert.ok(sitemapXml.includes('<loc>https://dvds-zone.co.uk/delivery</loc>'), 'Must include delivery page');
  assert.ok(sitemapXml.includes('<loc>https://dvds-zone.co.uk/returns</loc>'), 'Must include returns page');
  assert.ok(!sitemapXml.includes('/admin'), 'Must not include admin in sitemap');
  assert.ok(!sitemapXml.includes('/checkout'), 'Must not include checkout in sitemap');
});

// 8. Check server.js middleware and status handling
runCheck('8. server.js has canonical host & trailing slash redirect middleware and status handling', () => {
  const serverCode = readFileSync(resolve(rootDir, 'server.js'), 'utf8');
  assert.ok(serverCode.includes('Canonical Host (non-www) & Trailing Slash Redirection'), 'Must have redirect middleware');
  assert.ok(serverCode.includes('res.redirect(301,'), 'Must redirect with 301');
  assert.ok(serverCode.includes('res.status(status)'), 'Must set status code from seoResult');
});

// 9. Check api/_seo-renderer.js
runCheck('9. api/_seo-renderer.js has SeoResponse with 404 for missing products', () => {
  const rendererCode = readFileSync(resolve(rootDir, 'api/_seo-renderer.js'), 'utf8');
  assert.ok(rendererCode.includes('class SeoResponse'), 'Must have SeoResponse class');
  assert.ok(rendererCode.includes('return new SeoResponse(modifiedHtml, 404);'), 'Must return 404 for missing products');
  assert.ok(rendererCode.includes('DVDs Zone'), 'Must default to DVDs Zone');
});

// 10. Check defaultStoreSettings.ts
runCheck('10. defaultStoreSettings.ts has store_name DVDs Zone and canonical titles', () => {
  const settingsCode = readFileSync(resolve(rootDir, 'src/data/defaultStoreSettings.ts'), 'utf8');
  assert.ok(settingsCode.includes("store_name: 'DVDs Zone'"), "Must have store_name 'DVDs Zone'");
  assert.ok(settingsCode.includes("seo_site_title: 'DVDs Zone | DVD Movies & TV Box Sets UK'"), 'Must have DVDs Zone title');
});

// 11. Check publicApi.ts
runCheck('11. publicApi.ts preserves DVDs Zone and AZRAYAN LTD without forcing legacy names', () => {
  const apiCode = readFileSync(resolve(rootDir, 'src/lib/publicApi.ts'), 'utf8');
  assert.ok(apiCode.includes("result.store_name = 'DVDs Zone'"), "Must default store_name to 'DVDs Zone'");
  assert.ok(apiCode.includes("result.registered_company_name = 'AZRAYAN LTD'"), "Must default company to 'AZRAYAN LTD'");
});

// 12. Check SearchPage.tsx
runCheck('12. SearchPage.tsx has permanent noIndex={true} and DVDs Zone branding', () => {
  const searchCode = readFileSync(resolve(rootDir, 'src/pages/SearchPage.tsx'), 'utf8');
  assert.ok(searchCode.includes('noIndex={true}'), 'SearchPage must permanently have noIndex={true}');
  assert.ok(searchCode.includes('siteName="DVDs Zone"'), 'SearchPage must use DVDs Zone');
});

console.log(`\n================================`);
console.log(`Summary: ${passCount} PASSED, ${failCount} FAILED`);
console.log(`================================\n`);

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
