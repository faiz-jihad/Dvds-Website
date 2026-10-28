import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { injectSeoTags, generateDynamicSitemap } from '../api/_seo-renderer.js';

const rootDir = resolve(process.cwd());
let passCount = 0;
let failCount = 0;

async function runCheck(name, fn) {
  try {
    await fn();
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
runCheck('2. index.html primary title is optimized for DVDs Zone and DVD Zone', () => {
  const indexHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf8');
  assert.ok(
    indexHtml.includes('<title>DVDs Zone (DVD Zone UK) | DVD Movies &amp; TV Box Sets UK</title>'),
    'Title tag must match DVDs Zone (DVD Zone UK) | DVD Movies & TV Box Sets UK'
  );
});

// 3. Check index.html meta description, canonical, OpenGraph, Twitter
runCheck('3. index.html meta description, OpenGraph, and Twitter cards use DVDs Zone and DVD Zone', () => {
  const indexHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf8');
  assert.ok(
    indexHtml.includes('name="description" content="Shop DVDs and TV box sets at DVDs Zone (DVD Zone UK). Explore our collection of physical entertainment releases with UK delivery options."'),
    'Meta description must match production guideline'
  );
  assert.ok(indexHtml.includes('property="og:title" content="DVDs Zone (DVD Zone UK) | DVD Movies &amp; TV Box Sets UK"'), 'og:title must match DVDs Zone (DVD Zone UK)');
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
  assert.ok(sitemapXml.includes('<loc>https://dvds-zone.co.uk/shop/category/tv-box-sets</loc>'), 'Must include clean tv-box-sets category route');
  assert.ok(sitemapXml.includes('<loc>https://dvds-zone.co.uk/product/star-wars-the-mandalorian-seasons-1-3</loc>'), 'Must include real product');
  assert.ok(sitemapXml.includes('<loc>https://dvds-zone.co.uk/delivery</loc>'), 'Must include delivery page');
  assert.ok(sitemapXml.includes('<loc>https://dvds-zone.co.uk/returns</loc>'), 'Must include returns page');
  assert.ok(!sitemapXml.includes('/admin'), 'Must not include admin in sitemap');
  assert.ok(!sitemapXml.includes('/checkout'), 'Must not include checkout in sitemap');
  assert.ok(!/<loc>[^<]*\?/.test(sitemapXml), 'Sitemap <loc> entries must contain zero parameterized URLs');
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
  assert.ok(settingsCode.includes("seo_site_title: 'DVDs Zone (DVD Zone UK) | DVD Movies & TV Box Sets UK'"), 'Must have DVDs Zone (DVD Zone UK) title');
});

// 11. Check publicApi.ts
runCheck('11. publicApi.ts preserves DVDs Zone and AZRAYAN LTD without forcing legacy names', () => {
  const apiCode = readFileSync(resolve(rootDir, 'src/lib/publicApi.ts'), 'utf8');
  assert.ok(apiCode.includes("result.store_name = 'DVDs Zone'"), "Must default store_name to 'DVDs Zone'");
  assert.ok(apiCode.includes("result.registered_company_name = 'AZRAYAN LTD'"), "Must default company to 'AZRAYAN LTD'");
});

// 12. Check SearchPage.tsx
await runCheck('12. SearchPage.tsx has permanent noIndex={true} and DVDs Zone branding', () => {
  const searchCode = readFileSync(resolve(rootDir, 'src/pages/SearchPage.tsx'), 'utf8');
  assert.ok(searchCode.includes('noIndex={true}'), 'SearchPage must permanently have noIndex={true}');
  assert.ok(searchCode.includes('siteName="DVDs Zone"'), 'SearchPage must use DVDs Zone');
});

// 13. Check routes.tsx for dedicated genre and category routes
await runCheck('13. routes.tsx includes shop/genre/:genre and shop/category/:category routes', () => {
  const routesCode = readFileSync(resolve(rootDir, 'src/app/routes.tsx'), 'utf8');
  assert.ok(routesCode.includes("path: 'shop/genre/:genre'"), "routes.tsx must define 'shop/genre/:genre'");
  assert.ok(routesCode.includes("path: 'shop/category/:category'"), "routes.tsx must define 'shop/category/:category'");
});

// 14. Check Shop.tsx for crawlable genre/category links and self-referencing canonical logic
await runCheck('14. Shop.tsx uses crawlable Link tags and dynamic canonical for genres and categories', () => {
  const shopCode = readFileSync(resolve(rootDir, 'src/pages/Shop.tsx'), 'utf8');
  assert.ok(shopCode.includes('/shop/genre/${g.slug}'), 'Shop.tsx must render crawlable Link to /shop/genre/:slug');
  assert.ok(shopCode.includes('/shop/category/${c.slug}'), 'Shop.tsx must render crawlable Link to /shop/category/:slug');
  assert.ok(shopCode.includes('/shop/genre/${encodeURIComponent(activeGenre.slug)}'), 'Shop.tsx must compute /shop/genre/:slug canonical');
  assert.ok(shopCode.includes('/shop/category/${encodeURIComponent(activeCategory.slug)}'), 'Shop.tsx must compute /shop/category/:slug canonical');
  assert.ok(shopCode.includes("canonicalPath = '/shop'"), 'Shop.tsx must default canonical to /shop for functional filters');
});

// 15. Check api/_seo-renderer.js for dedicated genre SSR & canonicals on real index.html
await runCheck('15. api/_seo-renderer.js injects self-referencing canonicals & single H1 for dedicated genre landing pages on real index.html', async () => {
  const realHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf8');
  
  // Drama
  const dramaRes = await injectSeoTags(realHtml, '/shop/genre/drama');
  assert.equal(dramaRes.status, 200, 'Drama route must return HTTP 200');
  assert.ok(dramaRes.html.includes('href="https://dvds-zone.co.uk/shop/genre/drama"'), 'Drama canonical must be https://dvds-zone.co.uk/shop/genre/drama');
  assert.ok(dramaRes.html.includes('Drama &amp; Crime DVDs &amp; TV Box Sets | DVDs Zone UK'), 'Drama title must be descriptive');
  assert.ok(dramaRes.html.includes('Genre Collection'), 'Drama fallback HTML must render genre header');
  assert.equal((dramaRes.html.match(/<link\s+[^>]*rel="canonical"/gi) || []).length, 1, 'Must have exactly one canonical link');
  assert.equal((dramaRes.html.match(/<h1\b/gi) || []).length, 1, 'Must have exactly one H1 tag without dangling homepage H1');

  // Science-fiction
  const scifiRes = await injectSeoTags(realHtml, '/shop/genre/science-fiction');
  assert.equal(scifiRes.status, 200);
  assert.ok(scifiRes.html.includes('href="https://dvds-zone.co.uk/shop/genre/science-fiction"'));
  assert.equal((scifiRes.html.match(/<h1\b/gi) || []).length, 1);

  // Non-existent genre must return 404
  const invalidRes = await injectSeoTags(realHtml, '/shop/genre/non-existent-genre-12345');
  assert.equal(invalidRes.status, 404, 'Invalid genre route must return HTTP 404');
  assert.ok(invalidRes.html.includes('Genre Not Found'), 'Invalid genre must indicate 404 content');
  assert.equal((invalidRes.html.match(/<h1\b/gi) || []).length, 1);
});

// 16. Check api/_seo-renderer.js canonicalizes parameterized genre/category URLs directly to dedicated clean landing pages
await runCheck('16. api/_seo-renderer.js canonicalizes /shop?genre=... and /shop?category=... to dedicated clean routes', async () => {
  const realHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf8');
  
  // /shop?genre=drama
  const paramRes = await injectSeoTags(realHtml, '/shop?genre=drama');
  assert.equal(paramRes.status, 200);
  assert.ok(
    paramRes.html.includes('<link rel="canonical" href="https://dvds-zone.co.uk/shop/genre/drama" data-ssr="true" />'),
    '/shop?genre=drama must have canonical https://dvds-zone.co.uk/shop/genre/drama'
  );
  assert.ok(
    paramRes.html.includes('href="https://dvds-zone.co.uk/shop/genre/drama"'),
    '/shop?genre=drama must include crawlable link to clean persistent /shop/genre/drama'
  );

  // /shop?genre=crime&max_price=50
  const multiParamRes = await injectSeoTags(realHtml, '/shop?genre=crime&max_price=50');
  assert.equal(multiParamRes.status, 200);
  assert.ok(
    multiParamRes.html.includes('<link rel="canonical" href="https://dvds-zone.co.uk/shop/genre/crime" data-ssr="true" />'),
    '/shop?genre=crime&max_price=50 must have canonical https://dvds-zone.co.uk/shop/genre/crime'
  );

  // /shop?category=tv-box-sets
  const catParamRes = await injectSeoTags(realHtml, '/shop?category=tv-box-sets');
  assert.equal(catParamRes.status, 200);
  assert.ok(
    catParamRes.html.includes('<link rel="canonical" href="https://dvds-zone.co.uk/shop/category/tv-box-sets" data-ssr="true" />'),
    '/shop?category=tv-box-sets must have canonical https://dvds-zone.co.uk/shop/category/tv-box-sets'
  );
  assert.ok(
    catParamRes.html.includes('href="https://dvds-zone.co.uk/shop/category/tv-box-sets"'),
    '/shop?category=tv-box-sets must include crawlable link to /shop/category/tv-box-sets'
  );
});

// 17. Check api/_seo-renderer.js canonicalizes functional filters to /shop parent and filters products accurately
await runCheck('17. api/_seo-renderer.js canonicalizes functional filter queries (?filter=new, ?max_price=50, ?format=box-set) cleanly to /shop', async () => {
  const realHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf8');
  
  const testUrls = [
    '/shop',
    '/shop?filter=new',
    '/shop?filter=sale',
    '/shop?format=box-set',
    '/shop?max_price=50',
    '/shop?sort=price-asc',
  ];

  for (const url of testUrls) {
    const res = await injectSeoTags(realHtml, url);
    assert.equal(res.status, 200, `${url} must return 200`);
    assert.ok(
      res.html.includes('href="https://dvds-zone.co.uk/shop"'),
      `${url} canonical must point to https://dvds-zone.co.uk/shop`
    );
    assert.equal((res.html.match(/<h1\b/gi) || []).length, 1, `${url} must have a single H1`);
  }

  // Verify format=box-set actually matches Box Set products (9 products in catalog)
  const boxSetRes = await injectSeoTags(realHtml, '/shop?format=box-set');
  assert.ok(boxSetRes.html.includes('Available Releases (9)'), '/shop?format=box-set must render the 9 Box Set releases');
});

// 18. Check static & dynamic sitemap contain all dedicated genre/category landing pages, all 26 Supabase products, and NO parameterized query filter URLs
await runCheck('18. public/sitemap.xml & generateDynamicSitemap contain all 13 genre landing URLs, all 26 active products, and zero parameterized filter queries', async () => {
  const sitemapXml = readFileSync(resolve(rootDir, 'public/sitemap.xml'), 'utf8');
  const dynamicXml = await generateDynamicSitemap('https://dvds-zone.co.uk');
  
  const expectedGenres = [
    'action', 'science-fiction', 'drama', 'war', 'documentary',
    'music', 'western', 'crime', 'comedy', 'historical', 'adventure',
    'romance', 'faith'
  ];

  for (const genre of expectedGenres) {
    assert.ok(
      sitemapXml.includes(`<loc>https://dvds-zone.co.uk/shop/genre/${genre}</loc>`),
      `sitemap.xml must include /shop/genre/${genre}`
    );
    assert.ok(
      dynamicXml.includes(`<loc>https://dvds-zone.co.uk/shop/genre/${genre}</loc>`),
      `dynamic sitemap must include /shop/genre/${genre}`
    );
  }

  const expectedProductSlugs = [
    'ozerk-season-14', 'marshals', 'ncis-19', 'stranger-things-14-season-',
    'yellowstone-14-season-', 'mandalorain-season-13', 'mandalorian-12',
    'legacies-the-fourth-and-final-season', 'the-boys-season3-', 'yellowstone-season3',
    'mandalorian-3', 'greyhound-', 'seal-team-season-five',
    'the-book-of-boba-fett-the-first-complete-season', 'stranger-things-season-14-dvd-set',
    'dutton-ranch-season1', 'the-beateles-get-back', 'dutton-ranch-season-1',
    'marshals-season-1', 'the-chosen-seasons-13', 'friends-the-reunion',
    'greyhound', 'star-wars-the-mandalorian-seasons-13', 'seal-team-season-5',
    'star-wars-the-mandalorian-season-3', 'star-wars-the-book-of-boba-fett-season-1'
  ];

  for (const slug of expectedProductSlugs) {
    assert.ok(
      sitemapXml.includes(`<loc>https://dvds-zone.co.uk/product/${slug}</loc>`),
      `sitemap.xml must include /product/${slug}`
    );
    assert.ok(
      dynamicXml.includes(`<loc>https://dvds-zone.co.uk/product/${slug}</loc>`),
      `dynamic sitemap must include /product/${slug}`
    );
  }

  // Ensure no query parameters are in either sitemap's <loc> entries
  assert.ok(!/<loc>[^<]*\?/.test(sitemapXml), 'Static sitemap <loc> entries must not contain any ? query parameters');
  assert.ok(!/<loc>[^<]*\?/.test(dynamicXml), 'Dynamic sitemap <loc> entries must not contain any ? query parameters');
});

// 19. Production Server (server.js) End-to-End Express HTTP Pipeline Verification
await runCheck('19. server.js serves HTTP 200/301/404, Content-Type, canonicals, single H1, crawlable links, robots.txt & sitemap.xml', async () => {
  process.env.SITE_URL = 'https://dvds-zone.co.uk';
  const { app } = await import('../server.js');
  // Clear Supabase network URLs for fast offline test execution inside sandbox
  delete process.env.SUPABASE_URL;
  delete process.env.VITE_SUPABASE_URL;
  const http = await import('node:http');
  const { Duplex } = await import('node:stream');

  async function requestApp(reqPath, customHeaders = {}) {
    return new Promise((resolveResp, rejectResp) => {
      const socket = new Duplex({
        read() {},
        write(_chunk, _enc, cb) { cb(); },
      });
      socket.remoteAddress = '127.0.0.1';

      const req = new http.IncomingMessage(socket);
      req.method = 'GET';
      req.url = reqPath;
      req.originalUrl = reqPath;
      req.headers = {
        host: 'dvds-zone.co.uk',
        'x-forwarded-proto': 'https',
        ...customHeaders,
      };

      const res = new http.ServerResponse(req);
      res.assignSocket(socket);

      const chunks = [];
      const origWrite = res.write.bind(res);
      const origEnd = res.end.bind(res);

      res.write = (chunk, encoding, cb) => {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
        return origWrite(chunk, encoding, cb);
      };
      res.end = (chunk, encoding, cb) => {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
        origEnd(chunk, encoding, cb);
        resolveResp({
          status: res.statusCode,
          headers: res.getHeaders(),
          body: Buffer.concat(chunks).toString('utf8'),
        });
      };

      try {
        app.handle(req, res, (err) => {
          if (err) rejectResp(err);
        });
      } catch (err) {
        rejectResp(err);
      }
    });
  }

  const routeChecks = [
    { path: '/', expectedCanonical: 'https://dvds-zone.co.uk/', expectedH1: 'DVDs Zone — DVD Movies &amp; TV Box Sets UK' },
    { path: '/shop', expectedCanonical: 'https://dvds-zone.co.uk/shop', expectedH1: 'DVD Movies &amp; TV Box Sets UK Catalogue' },
    { path: '/shop?filter=new', expectedCanonical: 'https://dvds-zone.co.uk/shop', expectedH1: 'DVD Movies &amp; TV Box Sets UK Catalogue' },
    { path: '/shop?filter=sale', expectedCanonical: 'https://dvds-zone.co.uk/shop', expectedH1: 'DVD Movies &amp; TV Box Sets UK Catalogue' },
    { path: '/shop?genre=drama', expectedCanonical: 'https://dvds-zone.co.uk/shop/genre/drama', expectedH1: 'Drama &amp; Crime DVDs &amp; TV Box Sets UK' },
    { path: '/shop?format=box-set', expectedCanonical: 'https://dvds-zone.co.uk/shop', expectedH1: 'DVD Movies &amp; TV Box Sets UK Catalogue' },
    { path: '/shop?max_price=50', expectedCanonical: 'https://dvds-zone.co.uk/shop', expectedH1: 'DVD Movies &amp; TV Box Sets UK Catalogue' },
    { path: '/shop/genre/drama', expectedCanonical: 'https://dvds-zone.co.uk/shop/genre/drama', expectedH1: 'Drama &amp; Crime DVDs &amp; TV Box Sets UK' },
    { path: '/shop/genre/crime', expectedCanonical: 'https://dvds-zone.co.uk/shop/genre/crime', expectedH1: 'Crime &amp; Thriller DVDs &amp; TV Box Sets UK' },
    { path: '/shop/genre/documentary', expectedCanonical: 'https://dvds-zone.co.uk/shop/genre/documentary', expectedH1: 'Documentary DVDs &amp; TV Box Sets UK' },
    { path: '/shop/genre/music', expectedCanonical: 'https://dvds-zone.co.uk/shop/genre/music', expectedH1: 'Music &amp; Concerts DVDs &amp; TV Box Sets UK' },
    { path: '/shop/genre/science-fiction', expectedCanonical: 'https://dvds-zone.co.uk/shop/genre/science-fiction', expectedH1: 'Science Fiction DVDs &amp; TV Box Sets UK' },
    { path: '/shop/genre/war', expectedCanonical: 'https://dvds-zone.co.uk/shop/genre/war', expectedH1: 'War &amp; Military DVDs &amp; TV Box Sets UK' },
    { path: '/shop/category/tv-box-sets', expectedCanonical: 'https://dvds-zone.co.uk/shop/category/tv-box-sets', expectedH1: 'TV Box Sets DVDs &amp; TV Box Sets UK' },
    { path: '/product/star-wars-the-mandalorian-seasons-1-3', expectedCanonical: 'https://dvds-zone.co.uk/product/star-wars-the-mandalorian-seasons-1-3', expectedH1: 'Star Wars: The Mandalorian - Seasons 1-3 Box Set' },
  ];

  for (const check of routeChecks) {
    const resp = await requestApp(check.path);
    assert.equal(resp.status, 200, `HTTP GET ${check.path} must return 200`);
    const ct = String(resp.headers['content-type'] || '');
    assert.ok(ct.includes('text/html'), `HTTP GET ${check.path} must return text/html`);
    assert.ok(
      resp.body.includes(`<link rel="canonical" href="${check.expectedCanonical}" data-ssr="true" />`),
      `HTTP GET ${check.path} must have canonical ${check.expectedCanonical}`
    );
    assert.equal((resp.body.match(/<link\s+[^>]*rel="canonical"/gi) || []).length, 1, `HTTP GET ${check.path} must have 1 canonical tag`);
    assert.equal((resp.body.match(/<h1\b/gi) || []).length, 1, `HTTP GET ${check.path} must have 1 H1 tag`);
    assert.ok(resp.body.includes(check.expectedH1), `HTTP GET ${check.path} must include expected H1 "${check.expectedH1}"`);
    assert.ok(resp.body.includes('<meta name="robots" content="index, follow'), `HTTP GET ${check.path} must be indexable`);
  }

  // Test 404 routes over HTTP pipeline
  for (const notFoundPath of ['/product/non-existent-dvd-999', '/shop/genre/non-existent-genre', '/shop/category/non-existent-category']) {
    const resp404 = await requestApp(notFoundPath);
    assert.equal(resp404.status, 404, `HTTP GET ${notFoundPath} must return 404`);
    assert.ok(resp404.body.includes('<meta name="robots" content="noindex, nofollow" />'), `HTTP GET ${notFoundPath} must have noindex, nofollow`);
  }

  // Test /privacy and /terms (no 301 redirect loop)
  for (const legalPath of ['/privacy', '/terms']) {
    const respLegal = await requestApp(legalPath);
    assert.equal(respLegal.status, 200, `HTTP GET ${legalPath} must return 200 without redirect loop`);
  }

  // Test trailing slash 301 redirect
  const slashResp = await requestApp('/shop/');
  assert.equal(slashResp.status, 301, 'HTTP GET /shop/ must return 301 redirect');
  assert.equal(slashResp.headers['location'], 'https://dvds-zone.co.uk/shop', 'HTTP GET /shop/ must redirect to https://dvds-zone.co.uk/shop');

  // Test www host 301 redirect
  const wwwResp = await requestApp('/shop?filter=new', { host: 'www.dvds-zone.co.uk' });
  assert.equal(wwwResp.status, 301, 'HTTP GET www.dvds-zone.co.uk/shop?filter=new must return 301 redirect');
  assert.equal(wwwResp.headers['location'], 'https://dvds-zone.co.uk/shop?filter=new', 'www host must redirect to non-www preserving query');

  // Test /robots.txt
  const robotsResp = await requestApp('/robots.txt');
  assert.equal(robotsResp.status, 200, 'HTTP GET /robots.txt must return 200');
  assert.ok(String(robotsResp.headers['content-type'] || '').includes('text/plain'), '/robots.txt must be text/plain');
  assert.ok(robotsResp.body.includes('Sitemap: https://dvds-zone.co.uk/sitemap.xml'), '/robots.txt must declare Sitemap');

  // Test /sitemap.xml
  const sitemapResp = await requestApp('/sitemap.xml');
  assert.equal(sitemapResp.status, 200, 'HTTP GET /sitemap.xml must return 200');
  assert.ok(String(sitemapResp.headers['content-type'] || '').includes('application/xml'), '/sitemap.xml must be application/xml');
  assert.ok(!/<loc>[^<]*\?/.test(sitemapResp.body), '/sitemap.xml must have zero parameterized <loc> URLs');
  assert.ok(sitemapResp.body.includes('<loc>https://dvds-zone.co.uk/shop/genre/drama</loc>'), '/sitemap.xml must include /shop/genre/drama');
});

console.log(`\n================================`);
console.log(`Summary: ${passCount} PASSED, ${failCount} FAILED`);
console.log(`================================\n`);

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
