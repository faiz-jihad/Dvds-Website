import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { injectSeoTags, generateDynamicSitemap } from '../api/_seo-renderer.js';

const rootDir = resolve(process.cwd());

test('1. searchEngine.ts contains brand query tolerance for DVDs Zone and AZ Rayan variations', () => {
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

test('2. index.html primary title is optimized for DVDs Zone', () => {
  const indexHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf8');
  assert.ok(
    indexHtml.includes('<title>DVDs Zone | DVD Movies &amp; TV Box Sets UK</title>'),
    'Title tag must match DVDs Zone | DVD Movies & TV Box Sets UK'
  );
});

test('3. index.html meta description, keywords, OpenGraph, and Twitter tags use DVDs Zone', () => {
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

test('4. index.html Schema.org JSON-LD contains Brand, WebSite, and OnlineStore with DVDs Zone', () => {
  const indexHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('"@type": "WebSite"'), 'Schema must define WebSite');
  assert.ok(indexHtml.includes('"@type": "OnlineStore"'), 'Schema must define OnlineStore');
  assert.ok(indexHtml.includes('"@type": "Brand"'), 'Schema must define Brand');
  assert.ok(indexHtml.includes('"name": "DVDs Zone"'), 'Schema must define name as "DVDs Zone"');
  assert.ok(indexHtml.includes('"alternateName": ['), 'Schema must define alternateName array');
  assert.ok(indexHtml.includes('"dvdzone"'), 'alternateName must include "dvdzone"');
  assert.ok(indexHtml.includes('"dvd zone"'), 'alternateName must include "dvd zone"');
  assert.ok(indexHtml.includes('"AZ Rayan DVDs"'), 'alternateName must include "AZ Rayan DVDs"');
  assert.ok(indexHtml.includes('"dvds-zone.co.uk"'), 'alternateName must include "dvds-zone.co.uk"');
  assert.ok(indexHtml.includes('"AZRAYAN LTD"'), 'Schema must reference verified company AZRAYAN LTD');
});

test('5. index.html pre-rendered crawlable HTML contains semantic headings, anchors, and DVDs Zone', () => {
  const indexHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('DVDs Zone — DVD Movies &amp; TV Box Sets UK'), 'H1 must include DVDs Zone');
  assert.ok(indexHtml.includes('href="/shop"'), 'Must have crawlable link to /shop');
  assert.ok(indexHtml.includes('href="/product/star-wars-the-mandalorian-seasons-1-3"'), 'Must have crawlable link to active product');
});

test('6. public/robots.txt and api/robots.js are properly configured', () => {
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

test('7. public/sitemap.xml contains valid canonical URLs and active catalog', () => {
  const sitemapXml = readFileSync(resolve(rootDir, 'public/sitemap.xml'), 'utf8');
  assert.ok(sitemapXml.includes('<loc>https://dvds-zone.co.uk/</loc>'), 'Must include homepage');
  assert.ok(sitemapXml.includes('<loc>https://dvds-zone.co.uk/shop</loc>'), 'Must include shop');
  assert.ok(sitemapXml.includes('<loc>https://dvds-zone.co.uk/shop/category/tv-box-sets</loc>'), 'Must include clean tv-box-sets route');
  assert.ok(sitemapXml.includes('<loc>https://dvds-zone.co.uk/product/star-wars-the-mandalorian-seasons-1-3</loc>'), 'Must include real product');
  assert.ok(sitemapXml.includes('<loc>https://dvds-zone.co.uk/delivery</loc>'), 'Must include delivery page');
  assert.ok(sitemapXml.includes('<loc>https://dvds-zone.co.uk/returns</loc>'), 'Must include returns page');
  assert.ok(!sitemapXml.includes('/admin'), 'Must not include admin in sitemap');
  assert.ok(!sitemapXml.includes('/checkout'), 'Must not include checkout in sitemap');
  assert.ok(!/<loc>[^<]*\?/.test(sitemapXml), 'Must not include any parameterized query URLs in sitemap <loc> tags');
});

test('8. server.js has canonical host & trailing slash redirect middleware and status handling', () => {
  const serverCode = readFileSync(resolve(rootDir, 'server.js'), 'utf8');
  assert.ok(serverCode.includes('Canonical Host (non-www) & Trailing Slash Redirection'), 'Must have redirect middleware');
  assert.ok(serverCode.includes('res.redirect(301,'), 'Must redirect with 301');
  assert.ok(serverCode.includes('res.status(status)'), 'Must set status code from seoResult');
});

test('9. api/_seo-renderer.js has SeoResponse with 404 for missing products', () => {
  const rendererCode = readFileSync(resolve(rootDir, 'api/_seo-renderer.js'), 'utf8');
  assert.ok(rendererCode.includes('class SeoResponse'), 'Must have SeoResponse class');
  assert.ok(rendererCode.includes('return new SeoResponse(modifiedHtml, 404);'), 'Must return 404 for missing products');
  assert.ok(rendererCode.includes('DVDs Zone'), 'Must default to DVDs Zone');
});

test('10. GoogleReviews component has official ReviewsWidget container and embed script', () => {
  const comp = readFileSync(resolve(rootDir, 'src/components/landing/GoogleReviews.tsx'), 'utf8');
  assert.ok(comp.includes('data-reviewgrid'), 'GoogleReviews must render data-reviewgrid attribute');
  assert.ok(comp.includes('5f7dfa8a-15b8-47ea-9bb9-fe31c19cdcf7'), 'GoogleReviews must default to 5f7dfa8a-15b8-47ea-9bb9-fe31c19cdcf7');
  assert.ok(comp.includes('https://reviewswidget.app/embed.js'), 'GoogleReviews must reference ReviewsWidget embed script');
});

test('11. Dedicated genre & category landing pages produce 200, self-referencing canonicals, unique copy, and single H1 on real index.html', async () => {
  const realHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf8');

  const genresToVerify = ['drama', 'music', 'crime', 'science-fiction', 'war', 'documentary'];
  const seenDescriptions = new Set();

  for (const gSlug of genresToVerify) {
    const res = await injectSeoTags(realHtml, `/shop/genre/${gSlug}`);
    assert.equal(res.status, 200, `/shop/genre/${gSlug} must return 200`);
    assert.ok(res.html.includes(`href="https://dvds-zone.co.uk/shop/genre/${gSlug}"`), `Must self-canonicalize /shop/genre/${gSlug}`);
    assert.ok(res.html.includes(`hreflang="en-GB" href="https://dvds-zone.co.uk/shop/genre/${gSlug}"`), 'hreflang en-GB must match canonical');
    assert.equal((res.html.match(/<link\s+[^>]*rel="canonical"/gi) || []).length, 1, 'Must have exactly one canonical link');
    assert.equal((res.html.match(/<h1\b/gi) || []).length, 1, 'Must have exactly one H1');

    const descMatch = res.html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
    assert.ok(descMatch && descMatch[1], 'Must have meta description');
    seenDescriptions.add(descMatch[1]);
  }
  assert.equal(seenDescriptions.size, genresToVerify.length, 'Each genre landing page must have a unique meta description');

  // Category landing pages
  for (const cSlug of ['tv-box-sets', 'film', 'documentary-music']) {
    const catRes = await injectSeoTags(realHtml, `/shop/category/${cSlug}`);
    assert.equal(catRes.status, 200);
    assert.ok(catRes.html.includes(`href="https://dvds-zone.co.uk/shop/category/${cSlug}"`));
    assert.equal((catRes.html.match(/<h1\b/gi) || []).length, 1);
  }

  const invalidGenreRes = await injectSeoTags(realHtml, '/shop/genre/invalid-test-genre');
  assert.equal(invalidGenreRes.status, 404);
  assert.ok(invalidGenreRes.html.includes('noindex, nofollow'));

  const invalidCatRes = await injectSeoTags(realHtml, '/shop/category/invalid-test-category');
  assert.equal(invalidCatRes.status, 404);
  assert.ok(invalidCatRes.html.includes('noindex, nofollow'));
});

test('12. Parameterized genre and category queries canonicalize directly to dedicated clean routes', async () => {
  const realHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf8');
  const reportedGenres = ['drama', 'music', 'crime', 'science-fiction', 'war', 'documentary'];

  for (const gSlug of reportedGenres) {
    const res = await injectSeoTags(realHtml, `/shop?genre=${gSlug}`);
    assert.equal(res.status, 200);
    assert.ok(
      res.html.includes(`<link rel="canonical" href="https://dvds-zone.co.uk/shop/genre/${gSlug}" data-ssr="true" />`),
      `/shop?genre=${gSlug} must canonicalize to /shop/genre/${gSlug} with data-ssr="true"`
    );
  }

  const multiRes = await injectSeoTags(realHtml, '/shop?genre=music&max_price=50');
  assert.equal(multiRes.status, 200);
  assert.ok(multiRes.html.includes('href="https://dvds-zone.co.uk/shop/genre/music"'));

  const catRes = await injectSeoTags(realHtml, '/shop?category=tv-box-sets');
  assert.equal(catRes.status, 200);
  assert.ok(catRes.html.includes('href="https://dvds-zone.co.uk/shop/category/tv-box-sets"'));
});

test('13. Functional filter query combinations canonicalize to clean /shop parent page and filter products properly', async () => {
  const realHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf8');
  const urls = [
    '/shop',
    '/shop?filter=new',
    '/shop?filter=sale',
    '/shop?format=box-set',
    '/shop?max_price=50',
    '/shop?sort=price-desc',
  ];

  for (const url of urls) {
    const res = await injectSeoTags(realHtml, url);
    assert.equal(res.status, 200);
    assert.ok(res.html.includes('<link rel="canonical" href="https://dvds-zone.co.uk/shop" data-ssr="true" />'), `${url} must canonicalize to /shop`);
    assert.ok(!res.html.includes('noindex'), `${url} must not have indiscriminate noindex`);
    assert.equal((res.html.match(/<h1\b/gi) || []).length, 1, `${url} must have exactly one H1`);
  }

  // Verify /shop?format=box-set filters to the 9 Box Set products (and does not return 0)
  const boxSetRes = await injectSeoTags(realHtml, '/shop?format=box-set');
  assert.ok(boxSetRes.html.includes('Available Releases (9)'), '/shop?format=box-set must render 9 Box Set products');

  // Verify /shop?filter=new filters to the 6 new release products
  const newRes = await injectSeoTags(realHtml, '/shop?filter=new');
  assert.ok(newRes.html.includes('Available Releases (6)'), '/shop?filter=new must render 6 New Release products');
});

test('14. routes.tsx, Shop.tsx, and index.html protect canonical integrity and normalize format filters', () => {
  const routesCode = readFileSync(resolve(rootDir, 'src/app/routes.tsx'), 'utf8');
  assert.ok(routesCode.includes("path: 'shop/genre/:genre'"));
  assert.ok(routesCode.includes("path: 'shop/category/:category'"));

  const shopCode = readFileSync(resolve(rootDir, 'src/pages/Shop.tsx'), 'utf8');
  assert.ok(shopCode.includes('/shop/genre/${g.slug}'));
  assert.ok(shopCode.includes('/shop/category/${c.slug}'));
  assert.ok(shopCode.includes('/shop/genre/${encodeURIComponent(activeGenre.slug)}'));
  assert.ok(shopCode.includes('/shop/category/${encodeURIComponent(activeCategory.slug)}'));
  assert.ok(shopCode.includes('matchesFormatFilter'), 'Shop.tsx must normalize format filter so box-set matches Box Set');

  const indexHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf8');
  assert.ok(
    indexHtml.includes("cl.getAttribute('data-ssr') !== 'true'"),
    'index.html inline script must not overwrite server-injected data-ssr canonicals'
  );
});

test('15. public/sitemap.xml and generateDynamicSitemap include canonical landing pages only and zero query parameters', async () => {
  const sitemapXml = readFileSync(resolve(rootDir, 'public/sitemap.xml'), 'utf8');
  const dynamicXml = await generateDynamicSitemap('https://dvds-zone.co.uk');

  for (const xml of [sitemapXml, dynamicXml]) {
    assert.ok(xml.includes('/shop/genre/drama'));
    assert.ok(xml.includes('/shop/genre/crime'));
    assert.ok(xml.includes('/shop/genre/documentary'));
    assert.ok(xml.includes('/shop/genre/music'));
    assert.ok(xml.includes('/shop/genre/science-fiction'));
    assert.ok(xml.includes('/shop/genre/war'));
    assert.ok(xml.includes('/shop/category/tv-box-sets'));
    assert.ok(xml.includes('/shop/category/film'));
    assert.ok(xml.includes('/shop/category/documentary-music'));
    assert.ok(!/<loc>[^<]*\?/.test(xml), 'Sitemap <loc> tags must contain zero parameterized query URLs');
  }
});

test('16. Product detail pages remain independently indexable and missing products return 404', async () => {
  const realHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf8');
  const prodRes = await injectSeoTags(realHtml, '/product/star-wars-the-mandalorian-seasons-1-3');
  assert.equal(prodRes.status, 200);
  assert.ok(prodRes.html.includes('href="https://dvds-zone.co.uk/product/star-wars-the-mandalorian-seasons-1-3"'));
  assert.ok(!prodRes.html.includes('noindex'));
  assert.equal((prodRes.html.match(/<h1\b/gi) || []).length, 1);

  const missingProdRes = await injectSeoTags(realHtml, '/product/non-existent-dvd-release-999');
  assert.equal(missingProdRes.status, 404);
  assert.ok(missingProdRes.html.includes('noindex, nofollow'));

  // Also verify against built dist/index.html if present
  const distPath = resolve(rootDir, 'dist/index.html');
  if (existsSync(distPath)) {
    const distHtml = readFileSync(distPath, 'utf8');
    const distDrama = await injectSeoTags(distHtml, '/shop/genre/drama');
    assert.equal(distDrama.status, 200);
    assert.equal((distDrama.html.match(/<link\s+[^>]*rel="canonical"/gi) || []).length, 1);
    assert.equal((distDrama.html.match(/<h1\b/gi) || []).length, 1);
  }
});

