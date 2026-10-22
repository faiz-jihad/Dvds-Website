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

function generatePrivacyHtml(baseUrl, settings) {
  const storeName = settings?.store_name || 'DVDS Zone';
  const companyName = settings?.registered_company_name || 'AZRAYAN LTD';
  const companyNumber = settings?.company_number || '13894195';
  const supportEmail = settings?.support_email || 'info@dvds-zone.co.uk';
  const supportPhone = settings?.support_phone || '00447400320038';

  return `
    <main style="max-width:900px;margin:0 auto;padding:40px 20px;font-family:system-ui,-apple-system,sans-serif;color:#1e293b;line-height:1.7;">
      <header style="margin-bottom:30px;border-bottom:2px solid #e2e8f0;padding-bottom:20px;">
        <span style="font-size:12px;letter-spacing:1.5px;color:#2563eb;text-transform:uppercase;font-weight:700;">Legal Notice &amp; Compliance</span>
        <h1 style="font-size:32px;font-weight:800;color:#0f172a;margin:10px 0;">Privacy Policy &amp; Google User Data Disclosures</h1>
        <p style="font-size:14px;color:#64748b;"><strong>Last updated:</strong> October 2026 &bull; Official Store: <strong>${escapeHtml(storeName)}</strong> (<a href="${baseUrl}" style="color:#2563eb;">${baseUrl}</a>)</p>
        <p style="font-size:14px;color:#64748b;">Operating Entity: <strong>${escapeHtml(companyName)}</strong> (Company No. ${escapeHtml(companyNumber)}, England &amp; Wales, active since 2021)</p>
      </header>

      <section style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin-bottom:30px;">
        <h2 style="font-size:18px;font-weight:700;color:#1e40af;margin-top:0;">1. Google Sign-In &amp; Google OAuth 2.0 User Data Policy</h2>
        <p><strong>${escapeHtml(storeName)}</strong> offers customers the option to create an account and authenticate using <strong>Google Sign-In (Google OAuth 2.0)</strong>. When you sign in with Google, we access and process specific information from your Google account strictly as outlined below:</p>
        
        <h3 style="font-size:15px;color:#1e3a8a;margin-top:15px;">A. What Google Data We Access:</h3>
        <ul style="padding-left:20px;">
          <li><strong>Your Name:</strong> Used to display your customer name on your account dashboard and shipping labels.</li>
          <li><strong>Your Email Address:</strong> Used as your unique account username to send transactional purchase receipts, order tracking updates, and customer support replies.</li>
          <li><strong>Your Profile Picture URL:</strong> Used to render your user avatar in the navigation bar and account profile page.</li>
          <li><strong>Google User ID (sub identifier):</strong> A unique technical string provided by Google to securely authenticate and link your account sessions.</li>
        </ul>
        <p style="font-size:13px;color:#475569;font-style:italic;">Note: We only request standard basic profile and email scopes (<code>openid</code>, <code>profile</code>, <code>email</code>). We do NOT request or access your Google contacts, Google Drive files, calendar, location history, or any other sensitive or restricted Google user data.</p>

        <h3 style="font-size:15px;color:#1e3a8a;margin-top:15px;">B. How We Use Google User Data:</h3>
        <ul style="padding-left:20px;">
          <li>To securely authenticate and log you into your ${escapeHtml(storeName)} account without requiring a separate password.</li>
          <li>To associate your purchase history, physical DVD orders, shipping addresses, and saved wishlist items with your profile.</li>
          <li>To provide seamless customer care and support regarding your physical orders.</li>
        </ul>

        <h3 style="font-size:15px;color:#1e3a8a;margin-top:15px;">C. Strict Protection &amp; Non-Sale of Google User Data:</h3>
        <ul style="padding-left:20px;">
          <li><strong>No Sale of Data:</strong> ${escapeHtml(storeName)} never sells, rents, leases, or trades Google user data to any third party, data broker, or marketing entity.</li>
          <li><strong>No Advertising Use:</strong> We do NOT share your Google user data with advertising platforms or track you across third-party websites.</li>
          <li><strong>No AI Model Training:</strong> Google user data is never used to train generalized artificial intelligence or machine learning models.</li>
        </ul>

        <div style="background:#ffffff;border:1px solid #93c5fd;padding:15px;border-radius:6px;margin-top:15px;">
          <strong style="color:#1e3a8a;display:block;margin-bottom:5px;">Google API Services User Data Policy Compliance Statement:</strong>
          <span>${escapeHtml(storeName)}&apos;s use and transfer to any other app of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline;font-weight:600;">Google API Services User Data Policy</a>, including the Limited Use requirements.</span>
        </div>

        <h3 style="font-size:15px;color:#1e3a8a;margin-top:15px;">D. Google User Data Retention &amp; Permanent Deletion:</h3>
        <ul style="padding-left:20px;">
          <li><strong>Retention:</strong> Your Google profile information is retained only as long as you maintain an active customer account with ${escapeHtml(storeName)}.</li>
          <li><strong>User-Requested Deletion:</strong> You have the absolute right to request the deletion of your account and all associated Google user data at any time. Simply send an email to <a href="mailto:${escapeHtml(supportEmail)}" style="color:#2563eb;font-weight:600;">${escapeHtml(supportEmail)}</a> with the subject line <em>&quot;Delete My Account &amp; Google Data&quot;</em>. All account profile records and authentication tokens will be permanently purged within 30 days.</li>
          <li><strong>Revoking Access:</strong> You can also immediately revoke ${escapeHtml(storeName)}&apos;s permission to access your Google account at any time directly through your Google Security settings at <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style="color:#2563eb;">https://myaccount.google.com/permissions</a>.</li>
        </ul>
      </section>

      <section style="margin-bottom:30px;">
        <h2 style="font-size:18px;font-weight:700;color:#0f172a;">2. Physical Order Fulfilment &amp; Payment Processing</h2>
        <p>When purchasing physical DVD box sets, films, or merchandise from ${escapeHtml(storeName)}, we collect necessary transactional information:</p>
        <ul style="padding-left:20px;">
          <li><strong>Delivery Information:</strong> Full recipient name, physical delivery address, and contact phone number. This is shared strictly with postal carriers (Royal Mail) solely to fulfill shipping and track physical deliveries across the UK and internationally.</li>
          <li><strong>Payment Processing:</strong> All card payments and digital wallets (Apple Pay, Google Pay, PayPal) are processed directly by PCI-DSS certified payment processors (Stripe Payments Europe, Ltd. and PayPal Holdings, Inc.). <strong>${escapeHtml(storeName)} never views, handles, or stores your raw credit or debit card numbers, CVC codes, or banking credentials.</strong></li>
          <li><strong>Statutory Invoicing:</strong> Order invoices are retained for 6 years in accordance with UK statutory HMRC accounting laws.</li>
        </ul>
      </section>

      <section style="margin-bottom:30px;">
        <h2 style="font-size:18px;font-weight:700;color:#0f172a;">3. Technical Security &amp; Data Storage Architecture</h2>
        <p>We enforce strict security safeguards including HTTPS / TLS 1.3 encryption with HTTP Strict Transport Security (HSTS), PostgreSQL database isolation with Row Level Security (RLS), and AES-256 encrypted backups at rest.</p>
      </section>

      <section style="margin-bottom:30px;">
        <h2 style="font-size:18px;font-weight:700;color:#0f172a;">4. Your Statutory Rights Under UK GDPR</h2>
        <p>Under the UK General Data Protection Regulation and the Data Protection Act 2018, you have comprehensive rights to access, rectify, restrict, or erase your personal data. You may also lodge a complaint with the UK Information Commissioner&apos;s Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" style="color:#2563eb;">ico.org.uk</a>.</p>
      </section>

      <footer style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-top:30px;">
        <h3 style="font-size:16px;font-weight:700;color:#0f172a;margin-top:0;">5. Data Controller Contact Information</h3>
        <p style="margin:5px 0;"><strong>Operating Brand:</strong> ${escapeHtml(storeName)} (<a href="${baseUrl}" style="color:#2563eb;">${baseUrl}</a>)</p>
        <p style="margin:5px 0;"><strong>Registered Legal Entity:</strong> ${escapeHtml(companyName)} (Company No. ${escapeHtml(companyNumber)}, England &amp; Wales)</p>
        <p style="margin:5px 0;"><strong>Privacy &amp; Data Deletion Email:</strong> <a href="mailto:${escapeHtml(supportEmail)}" style="color:#2563eb;">${escapeHtml(supportEmail)}</a></p>
        <p style="margin:5px 0;"><strong>Customer Support Telephone:</strong> <a href="tel:${escapeHtml(supportPhone)}" style="color:#2563eb;">${escapeHtml(supportPhone)}</a></p>
        <p style="margin:15px 0 0 0;"><a href="${baseUrl}/terms" style="color:#2563eb;margin-right:15px;">Terms &amp; Conditions</a> <a href="${baseUrl}/" style="color:#2563eb;">Return to Storefront</a></p>
      </footer>
    </main>
  `;
}

function generateHomeHtml(baseUrl, settings) {
  const storeName = settings?.store_name || 'DVDs Zone';
  const companyName = settings?.registered_company_name || 'AZRAYAN LTD';
  const companyNumber = settings?.company_number || '13894195';
  const supportEmail = settings?.support_email || 'info@dvds-zone.co.uk';
  const supportPhone = settings?.support_phone || '00447400320038';

  return `
    <header style="background:#07090e;color:#ffffff;padding:20px;border-bottom:1px solid rgba(255,255,255,0.1);font-family:system-ui,-apple-system,sans-serif;">
      <div style="max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:15px;">
        <div>
          <a href="${baseUrl}/" style="color:#ffffff;text-decoration:none;font-size:22px;font-weight:800;letter-spacing:-0.5px;">${escapeHtml(storeName)}</a>
          <span style="font-size:11px;color:#94a3b8;display:block;">Operated by ${escapeHtml(companyName)} &bull; United Kingdom</span>
        </div>
        <nav style="display:flex;gap:15px;font-size:13px;">
          <a href="${baseUrl}/shop" style="color:#94a3b8;text-decoration:none;">Catalogue</a>
          <a href="${baseUrl}/about" style="color:#94a3b8;text-decoration:none;">About</a>
          <a href="${baseUrl}/delivery" style="color:#94a3b8;text-decoration:none;">Delivery</a>
          <a href="${baseUrl}/privacy" style="color:#60a5fa;text-decoration:none;font-weight:600;">Privacy Policy</a>
          <a href="${baseUrl}/terms" style="color:#94a3b8;text-decoration:none;">Terms</a>
        </nav>
      </div>
    </header>

    <main style="max-width:1200px;margin:0 auto;padding:40px 20px;font-family:system-ui,-apple-system,sans-serif;color:#1e293b;line-height:1.6;">
      <!-- Hero & Application Purpose Statement -->
      <section style="background:#0b0f19;color:#ffffff;padding:40px;border-radius:12px;margin-bottom:40px;border:1px solid rgba(255,255,255,0.1);">
        <span style="display:inline-block;background:rgba(37,99,235,0.2);color:#60a5fa;font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px;margin-bottom:15px;letter-spacing:1px;text-transform:uppercase;">Official Store &amp; Application Identity</span>
        <h1 style="font-size:32px;font-weight:800;margin:0 0 15px 0;line-height:1.2;">About ${escapeHtml(storeName)} &amp; Application Purpose</h1>
        <p style="font-size:16px;color:#cbd5e1;max-width:850px;margin:0 0 20px 0;line-height:1.7;">
          <strong>${escapeHtml(storeName)}</strong> is an online physical media e-commerce store and entertainment catalogue operated by <strong>${escapeHtml(companyName)}</strong> (Company Registered in England and Wales No. ${escapeHtml(companyNumber)}, active since 2021). We supply authentic UK DVD box sets, Blu-ray discs, and television series with 100% Free UK standard delivery via Royal Mail.
        </p>
        <div style="display:flex;flex-wrap:wrap;gap:12px;">
          <a href="${baseUrl}/shop" style="display:inline-block;background:#2563eb;color:#ffffff;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none;">Browse Store Catalogue</a>
          <a href="${baseUrl}/privacy" style="display:inline-block;background:rgba(255,255,255,0.1);color:#ffffff;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none;">View Privacy Policy</a>
        </div>
      </section>

      <!-- Transparency & Open Access Disclosures -->
      <section style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:20px;margin-bottom:40px;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:25px;">
          <h2 style="font-size:18px;font-weight:700;color:#0f172a;margin-top:0;">100% Public Access &bull; No Login Required</h2>
          <p style="font-size:14px;color:#475569;">
            Our website is completely open and accessible to all visitors. You do NOT need to create an account or sign in to browse movies, check availability, read technical specs, or purchase items. Guest checkout is fully supported.
          </p>
        </div>

        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:25px;">
          <h2 style="font-size:18px;font-weight:700;color:#1e40af;margin-top:0;">Why Sign In With Google? (Optional)</h2>
          <p style="font-size:14px;color:#334155;">
            We offer optional <strong>Google Sign-In</strong> solely for customer convenience: to securely authenticate without a password, save favourite films to your wishlist, save UK shipping addresses, and track physical Royal Mail deliveries.
          </p>
          <p style="font-size:12px;color:#64748b;margin-top:8px;">
            We only request basic profile info (name, email, avatar). We never sell your data, never use it for advertising, and adhere strictly to the Google API Services User Data Policy.
          </p>
        </div>
      </section>

      <!-- Featured Catalogue Preview -->
      <section style="margin-bottom:40px;">
        <h2 style="font-size:22px;font-weight:800;color:#0f172a;margin-bottom:20px;">Featured Physical Media Releases</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:20px;">
          ${FALLBACK_PRODUCTS.slice(0, 4).map(p => `
            <article style="border:1px solid #e2e8f0;border-radius:8px;padding:15px;background:#ffffff;">
              <h3 style="font-size:15px;font-weight:700;margin:0 0 8px 0;"><a href="${baseUrl}/product/${p.slug}" style="color:#0f172a;text-decoration:none;">${escapeHtml(p.title)}</a></h3>
              <p style="font-size:13px;color:#64748b;margin:0 0 10px 0;">${escapeHtml(p.format)} &bull; ${escapeHtml(p.region_code)}</p>
              <p style="font-size:16px;font-weight:800;color:#2563eb;margin:0;">&pound;${Number(p.price).toFixed(2)} <span style="font-size:12px;color:#16a34a;font-weight:500;">Free UK Delivery</span></p>
            </article>
          `).join('')}
        </div>
      </section>

      <!-- Corporate Footer Details -->
      <footer style="border-top:1px solid #e2e8f0;padding-top:25px;font-size:13px;color:#64748b;">
        <p><strong>Operating Company:</strong> ${escapeHtml(companyName)} &bull; Registered in England and Wales No. ${escapeHtml(companyNumber)} &bull; Active since 2021</p>
        <p>Official Website: <a href="${baseUrl}" style="color:#2563eb;">${baseUrl}</a> &bull; Support: <a href="mailto:${escapeHtml(supportEmail)}" style="color:#2563eb;">${escapeHtml(supportEmail)}</a> &bull; Phone: <a href="tel:${escapeHtml(supportPhone)}" style="color:#2563eb;">${escapeHtml(supportPhone)}</a></p>
        <p><a href="${baseUrl}/privacy" style="color:#2563eb;margin-right:15px;">Privacy Policy</a> <a href="${baseUrl}/terms" style="color:#2563eb;margin-right:15px;">Terms &amp; Conditions</a> <a href="${baseUrl}/about" style="color:#2563eb;">About Us</a></p>
      </footer>
    </main>
  `;
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

    // 3. PRIVACY POLICY ROUTE: /privacy (Google OAuth & UK GDPR Verification)
    if (pathname === '/privacy') {
      const title = `Privacy Policy & Google OAuth Disclosures — ${storeName} & AZRAYAN LTD`;
      const description = `Comprehensive Privacy Policy for ${storeName} operated by AZRAYAN LTD. Detailed disclosures for Google OAuth 2.0 user data, limited use compliance, and UK GDPR statutory rights.`;
      const canonicalUrl = `${baseUrl}/privacy`;

      modifiedHtml = modifiedHtml.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
      modifiedHtml = modifiedHtml.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${escapeHtml(description)}" />`);
      modifiedHtml = modifiedHtml.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`);
      modifiedHtml = modifiedHtml.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`);
      modifiedHtml = modifiedHtml.replace('<div id="root"></div>', `<div id="root">${generatePrivacyHtml(baseUrl, settings)}</div>`);
    }

    // 4. HOMEPAGE ROUTE: / (Application Purpose & Public Storefront)
    if (pathname === '/' || pathname === '') {
      if (settings?.seo_site_title) {
        modifiedHtml = modifiedHtml.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(settings.seo_site_title)}</title>`);
      }
      if (settings?.seo_site_description) {
        modifiedHtml = modifiedHtml.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${escapeHtml(settings.seo_site_description)}" />`);
      }
      modifiedHtml = modifiedHtml.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${escapeHtml(baseUrl)}/" />`);
      modifiedHtml = modifiedHtml.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${escapeHtml(baseUrl)}/" />`);
      modifiedHtml = modifiedHtml.replace('<div id="root"></div>', `<div id="root">${generateHomeHtml(baseUrl, settings)}</div>`);
    }

    // 4. OTHER PAGES: adjust canonical URL dynamically
    const canonicalUrl = `${baseUrl}${pathname}`;
    modifiedHtml = modifiedHtml.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`);
    modifiedHtml = modifiedHtml.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`);

    // Global dynamic replacements to ensure no hardcoded domain or legacy contacts persist
    if (baseUrl && baseUrl !== 'https://dvds-zone.co.uk') {
      modifiedHtml = modifiedHtml.replaceAll('https://dvds-zone.co.uk', baseUrl);
      modifiedHtml = modifiedHtml.replaceAll('https://dvdszone.co.uk', baseUrl);
    }
    const emailReplacement = settings?.support_email || settings?.contact_email || 'info@dvds-zone.co.uk';
    modifiedHtml = modifiedHtml.replaceAll('azrayanltd@gmail.com', escapeHtml(emailReplacement));
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
