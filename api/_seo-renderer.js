import { getSupabasePublicClient } from './_supabase.js';

let sitemapCache = null;
let sitemapCacheTime = 0;
const SITEMAP_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

let productCache = new Map();
let productCacheTime = 0;
const PRODUCT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let settingsCache = null;
let settingsCacheTime = 0;
const SETTINGS_CACHE_TTL = 5 * 60 * 1000;

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function getBaseUrl(req) {
  const envUrl = process.env.SITE_URL || process.env.VITE_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  return `${protocol}://${host}`.replace(/\/$/, '');
}

async function getStoreSettings() {
  const now = Date.now();
  if (settingsCache && (now - settingsCacheTime < SETTINGS_CACHE_TTL)) {
    return settingsCache;
  }
  const db = getSupabasePublicClient();
  if (!db) return null;

  try {
    const { data } = await db.from('store_settings').select('*').limit(1).maybeSingle();
    if (data) {
      settingsCache = data;
      settingsCacheTime = now;
      return data;
    }
  } catch (err) {
    console.error('[SEO] Error loading store settings:', err.message);
  }
  return null;
}
const FALLBACK_PRODUCTS = [
  { slug: 'star-wars-the-book-of-boba-fett-season-1', title: 'Star Wars: The Book of Boba Fett - The Complete First Season', format: 'Box Set', price: 14.99, cover_image_url: '/catalog/the-book-of-boba-fett-season-1.jpeg', description: 'Legendary bounty hunter Boba Fett and mercenary Fennec Shand navigate the galaxy underworld. Complete seven-episode first season.', region_code: 'Region 2 (UK/Europe)', stock_quantity: 3 },
  { slug: 'star-wars-the-mandalorian-seasons-1-3', title: 'Star Wars: The Mandalorian - Seasons 1-3 Box Set', format: 'Box Set', price: 24.99, cover_image_url: '/catalog/the-mandalorian-seasons-1-3.jpeg', description: 'Din Djarin crosses the lawless reaches of the galaxy with his foundling Grogu. Complete collector box set containing all 24 episodes.', region_code: 'Region 2 (UK/Europe)', stock_quantity: 4 },
  { slug: 'star-wars-the-mandalorian-seasons-1-2', title: 'Star Wars: The Mandalorian - Seasons 1 & 2', format: 'Box Set', price: 19.99, cover_image_url: '/catalog/the-mandalorian-seasons-1-2.jpeg', description: 'The first 16 chapters of Din Djarin and Grogu journey across the post-Empire outer rim in custom packaging.', region_code: 'Region 2 (UK/Europe)', stock_quantity: 5 },
  { slug: 'star-wars-the-mandalorian-season-3', title: 'Star Wars: The Mandalorian - Season 3', format: 'Box Set', price: 14.99, cover_image_url: '/catalog/the-mandalorian-season-3.jpeg', description: 'The journeys of the Mandalorian through the Star Wars galaxy continue as Din Djarin reunites with Grogu.', region_code: 'Region 2 (UK/Europe)', stock_quantity: 3 },
  { slug: 'the-chosen-seasons-1-3', title: 'The Chosen: Complete Seasons 1-3 Collector Edition', format: 'Box Set', price: 21.99, cover_image_url: '/catalog/the-chosen-seasons-1-3.jpeg', description: 'The ground-breaking historical drama series chronicling the life of Jesus through the eyes of those who met him.', region_code: 'Region 2 (UK/Europe)', stock_quantity: 4 },
  { slug: 'greyhound-2020', title: 'Greyhound (2020)', format: 'DVD', price: 9.99, cover_image_url: '/catalog/greyhound.jpeg', description: 'Early in World War II, an inexperienced U.S. Navy captain must lead an Allied convoy being stalked by Nazi U-boat wolfpacks.', region_code: 'Region 2 (UK/Europe)', stock_quantity: 6 },
  { slug: 'the-beatles-get-back', title: 'The Beatles: Get Back - 3-Disc Collector Edition', format: 'Box Set', price: 22.99, cover_image_url: '/catalog/the-beatles-get-back.jpeg', description: 'Peter Jackson documentary event chronicling the warmth, camaraderie and creative genius of The Beatles.', region_code: 'Region 2 (UK/Europe)', stock_quantity: 4 },
  { slug: 'friends-the-reunion', title: 'Friends: The Reunion - Special Collector Edition', format: 'DVD', price: 8.99, cover_image_url: '/catalog/friends-the-reunion.jpeg', description: 'Jennifer Aniston, Courteney Cox, Lisa Kudrow, Matt LeBlanc, Matthew Perry, and David Schwimmer return to Stage 24.', region_code: 'Region 2 (UK/Europe)', stock_quantity: 5 },
  { slug: 'seal-team-season-5', title: 'SEAL Team - Season Five', format: 'Box Set', price: 15.99, cover_image_url: '/catalog/seal-team-season-5.jpeg', description: 'The elite Bravo Team embarks on clandestine high-stakes global operations across the globe.', region_code: 'Region 2 (UK/Europe)', stock_quantity: 3 },
  { slug: 'dutton-ranch-season-1', title: 'Dutton Ranch: Origins - Season One', format: 'Box Set', price: 16.99, cover_image_url: '/catalog/dutton-ranch-season-1.jpeg', description: 'The brutal generation of Duttons wrestling untamed Montana land against unforgiving wilderness and rivals.', region_code: 'Region 2 (UK/Europe)', stock_quantity: 4 },
  { slug: 'marshals-season-1', title: 'Marshals - Season One', format: 'Box Set', price: 14.99, cover_image_url: '/catalog/marshals-season-1.jpeg', description: 'Federal deputy marshals pursue the nation most wanted fugitives across jurisdictional borders.', region_code: 'Region 2 (UK/Europe)', stock_quantity: 3 },
];

const FALLBACK_CATEGORIES = [
  { slug: 'tv-box-sets', name: 'TV Box Sets' },
  { slug: 'film', name: 'Film & Cinema' },
  { slug: 'documentary-music', name: 'Documentary & Music' },
];

async function getProductBySlug(slug) {
  const now = Date.now();
  if (productCache.has(slug) && (now - productCacheTime < PRODUCT_CACHE_TTL)) {
    return productCache.get(slug);
  }
  const db = getSupabasePublicClient();

  if (db) {
    try {
      const { data } = await db
        .from('products')
        .select('*, category:categories(name, slug)')
        .eq('slug', slug)
        .eq('status', 'active')
        .maybeSingle();

      if (data) {
        productCache.set(slug, data);
        productCacheTime = now;
        return data;
      }
    } catch (err) {
      console.error('[SEO] Error loading product by slug:', err.message);
    }
  }

  const fallback = FALLBACK_PRODUCTS.find((p) => p.slug === slug);
  if (fallback) {
    productCache.set(slug, fallback);
    return fallback;
  }
  return null;
}

export async function generateDynamicSitemap(baseUrl) {
  const now = Date.now();
  if (sitemapCache && (now - sitemapCacheTime < SITEMAP_CACHE_TTL)) {
    return sitemapCache;
  }

  const db = getSupabasePublicClient();
  let products = [];
  let categories = [];

  if (db) {
    try {
      const [prodRes, catRes] = await Promise.all([
        db.from('products').select('slug, title, cover_image_url, updated_at').eq('status', 'active'),
        db.from('categories').select('slug, is_active').eq('is_active', true),
      ]);
      if (prodRes.data && prodRes.data.length > 0) products = prodRes.data;
      if (catRes.data && catRes.data.length > 0) categories = catRes.data;
    } catch (err) {
      console.error('[SEO] Sitemap database query error:', err.message);
    }
  }

  if (products.length === 0) products = FALLBACK_PRODUCTS;
  if (categories.length === 0) categories = FALLBACK_CATEGORIES;

  const currentDate = new Date().toISOString().split('T')[0];

  const standardPages = [
    { path: '/', changefreq: 'daily', priority: '1.0' },
    { path: '/shop', changefreq: 'daily', priority: '0.95' },
    { path: '/about', changefreq: 'monthly', priority: '0.70' },
    { path: '/contact', changefreq: 'monthly', priority: '0.70' },
    { path: '/delivery', changefreq: 'weekly', priority: '0.80' },
    { path: '/returns', changefreq: 'monthly', priority: '0.70' },
    { path: '/faq', changefreq: 'weekly', priority: '0.75' },
    { path: '/terms', changefreq: 'monthly', priority: '0.50' },
    { path: '/privacy', changefreq: 'monthly', priority: '0.50' },
    { path: '/refund-policy', changefreq: 'monthly', priority: '0.50' },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
  xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n\n`;

  // Standard Pages
  for (const page of standardPages) {
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(`${baseUrl}${page.path}`)}</loc>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += `    <lastmod>${currentDate}</lastmod>\n`;
    xml += `  </url>\n`;
  }

  // Category Hubs
  for (const cat of categories) {
    if (!cat.slug) continue;
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(`${baseUrl}/shop?category=${encodeURIComponent(cat.slug)}`)}</loc>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.85</priority>\n`;
    xml += `    <lastmod>${currentDate}</lastmod>\n`;
    xml += `  </url>\n`;
  }

  // Active Product Pages
  for (const prod of products) {
    if (!prod.slug) continue;
    const lastmod = prod.updated_at ? new Date(prod.updated_at).toISOString().split('T')[0] : currentDate;
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(`${baseUrl}/product/${prod.slug}`)}</loc>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.90</priority>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;

    if (prod.cover_image_url) {
      const imgUrl = prod.cover_image_url.startsWith('http')
        ? prod.cover_image_url
        : `${baseUrl}${prod.cover_image_url.startsWith('/') ? '' : '/'}${prod.cover_image_url}`;
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${escapeXml(imgUrl)}</image:loc>\n`;
      xml += `      <image:title>${escapeXml(prod.title || 'DVD')}</image:title>\n`;
      xml += `    </image:image>\n`;
    }
    xml += `  </url>\n`;
  }

  xml += `</urlset>\n`;

  sitemapCache = xml;
  sitemapCacheTime = now;
  return xml;
}

export function generateDynamicRobots(baseUrl) {
  return [
    '# DVDs Zone – Dynamic Robots Configuration',
    'User-agent: *',
    'Allow: /',
    'Allow: /catalog/',
    'Allow: /product/',
    'Allow: /shop',
    'Disallow: /admin/',
    'Disallow: /admin',
    'Disallow: /account/',
    'Disallow: /account',
    'Disallow: /checkout',
    'Disallow: /cart',
    'Disallow: /order-success/',
    'Disallow: /api/',
    '',
    'User-agent: Googlebot-Image',
    'Allow: /catalog/',
    'Allow: /product/',
    'Allow: /',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    `Host: ${baseUrl}`,
    '',
  ].join('\n');
}

export async function injectSeoTags(rawHtml, reqUrl, baseUrl) {
  try {
    const urlObj = new URL(reqUrl, 'http://localhost');
    const pathname = urlObj.pathname;
    const settings = await getStoreSettings();
    const storeName = settings?.store_name || 'DVDs Zone';
    const googleVerification = process.env.GOOGLE_SITE_VERIFICATION || settings?.google_site_verification;

    let modifiedHtml = rawHtml;

    // Inject Google site verification tag if configured in .env or settings
    if (googleVerification && !modifiedHtml.includes('name="google-site-verification"')) {
      const metaVerify = `<meta name="google-site-verification" content="${escapeHtml(googleVerification)}" />`;
      modifiedHtml = modifiedHtml.replace('</head>', `  ${metaVerify}\n</head>`);
    }

    // 1. PRODUCT DETAIL ROUTE: /product/:slug
    const productMatch = pathname.match(/^\/product\/([a-zA-Z0-9_-]+)/);
    if (productMatch) {
      const slug = productMatch[1];
      const product = await getProductBySlug(slug);

      if (product) {
        const title = `${product.title} (${product.format || 'DVD'} Box Set) | Buy Online | ${storeName} UK`;
        const description = `${product.title}. ${product.description ? product.description.slice(0, 140).replace(/\s\S+$/, '') + '...' : ''} Free UK standard delivery on all orders. Same-day dispatch via Royal Mail.`;
        const canonicalUrl = `${baseUrl}/product/${product.slug}`;
        const imageUrl = product.cover_image_url
          ? (product.cover_image_url.startsWith('http') ? product.cover_image_url : `${baseUrl}${product.cover_image_url.startsWith('/') ? '' : '/'}${product.cover_image_url}`)
          : `${baseUrl}/catalog/the-mandalorian-seasons-1-3.jpeg`;

        const productSchema = {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.title,
          description: product.description || product.title,
          image: imageUrl,
          url: canonicalUrl,
          sku: product.sku || product.id,
          brand: { '@type': 'Brand', name: storeName },
          category: product.category?.name || 'Film & Entertainment',
          offers: {
            '@type': 'Offer',
            url: canonicalUrl,
            priceCurrency: 'GBP',
            price: Number(product.price).toFixed(2),
            itemCondition: 'https://schema.org/NewCondition',
            availability: (product.stock_quantity ?? 1) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            seller: { '@type': 'Organization', name: storeName },
            shippingDetails: {
              '@type': 'OfferShippingDetails',
              shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'GBP' },
              shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'GB' },
              deliveryTime: {
                '@type': 'ShippingDeliveryTime',
                handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
                transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'DAY' },
              },
            },
          },
        };

        const crawlerFallback = `
          <div id="root">
            <main style="display:none;" data-ssr-crawler="true">
              <article>
                <h1>${escapeHtml(product.title)}</h1>
                <p>${escapeHtml(product.description || '')}</p>
                <p>Format: ${escapeHtml(product.format || 'DVD')} | Region: ${escapeHtml(product.region_code || 'Region 2 (UK/Europe)')}</p>
                <p>Price: £${Number(product.price).toFixed(2)} — Free UK Standard Delivery</p>
                <p>Availability: ${(product.stock_quantity ?? 1) > 0 ? 'In Stock' : 'Out of Stock'}</p>
              </article>
            </main>
          </div>
        `.trim();

        // Replace Title
        modifiedHtml = modifiedHtml.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
        // Replace Meta Description
        modifiedHtml = modifiedHtml.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${escapeHtml(description)}" />`);
        // Replace Canonical
        modifiedHtml = modifiedHtml.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`);
        // Replace OpenGraph
        modifiedHtml = modifiedHtml.replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${escapeHtml(title)}" />`);
        modifiedHtml = modifiedHtml.replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${escapeHtml(description)}" />`);
        modifiedHtml = modifiedHtml.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`);
        modifiedHtml = modifiedHtml.replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`);
        // Replace Twitter
        modifiedHtml = modifiedHtml.replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${escapeHtml(title)}" />`);
        modifiedHtml = modifiedHtml.replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${escapeHtml(description)}" />`);
        modifiedHtml = modifiedHtml.replace(/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`);

        // Inject Product Schema JSON-LD before </head>
        const schemaScript = `\n    <script type="application/ld+json" id="server-product-schema">\n    ${JSON.stringify(productSchema)}\n    </script>\n`;
        modifiedHtml = modifiedHtml.replace('</head>', `${schemaScript}</head>`);

        // Inject Crawler fallback in root
        modifiedHtml = modifiedHtml.replace('<div id="root"></div>', crawlerFallback);

        return modifiedHtml;
      }
    }

    // 2. SHOP CATALOGUE ROUTE: /shop
    if (pathname === '/shop') {
      const title = `Buy DVDs, TV Box Sets & Cinema Releases Online | ${storeName} Catalogue`;
      const description = `Browse official DVDs, TV box sets, and cinema releases at ${storeName}. Free UK delivery on all orders with same-day dispatch via Royal Mail.`;
      const canonicalUrl = `${baseUrl}/shop`;

      modifiedHtml = modifiedHtml.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
      modifiedHtml = modifiedHtml.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${escapeHtml(description)}" />`);
      modifiedHtml = modifiedHtml.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`);
      modifiedHtml = modifiedHtml.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`);
      return modifiedHtml;
    }

    // 3. HOMEPAGE ROUTE: /
    if (pathname === '/' || pathname === '') {
      if (settings?.seo_site_title) {
        modifiedHtml = modifiedHtml.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(settings.seo_site_title)}</title>`);
      }
      if (settings?.seo_site_description) {
        modifiedHtml = modifiedHtml.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${escapeHtml(settings.seo_site_description)}" />`);
      }
      modifiedHtml = modifiedHtml.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${escapeHtml(baseUrl)}/" />`);
      modifiedHtml = modifiedHtml.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${escapeHtml(baseUrl)}/" />`);
      return modifiedHtml;
    }

    // 4. OTHER PAGES: adjust canonical URL dynamically
    const canonicalUrl = `${baseUrl}${pathname}`;
    modifiedHtml = modifiedHtml.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`);
    modifiedHtml = modifiedHtml.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`);

    // Global dynamic replacements to ensure no hardcoded domain or legacy contacts persist
    if (baseUrl && baseUrl !== 'https://dvdszone.co.uk') {
      modifiedHtml = modifiedHtml.replaceAll('https://dvdszone.co.uk', baseUrl);
    }
    const emailReplacement = settings?.support_email || settings?.contact_email;
    if (emailReplacement) {
      modifiedHtml = modifiedHtml.replaceAll('azrayanltd@gmail.com', escapeHtml(emailReplacement));
    }
    const phoneReplacement = settings?.support_phone || settings?.contact_phone;
    if (phoneReplacement) {
      modifiedHtml = modifiedHtml.replaceAll('+447400320038', escapeHtml(phoneReplacement));
    }
    if (settings?.store_name) {
      modifiedHtml = modifiedHtml.replaceAll('DVDs Zone Ltd', escapeHtml(settings.store_name));
    }

    return modifiedHtml;
  } catch (err) {
    console.error('[SEO] Error injecting SEO tags:', err);
    return rawHtml;
  }
}
