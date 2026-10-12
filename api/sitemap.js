import { generateDynamicSitemap, getBaseUrl } from './_seo-renderer.js';

export default async function handler(req, res) {
  try {
    const baseUrl = getBaseUrl(req);
    const xml = await generateDynamicSitemap(baseUrl);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=3600');
    return res.status(200).send(xml);
  } catch (error) {
    console.error('[API sitemap error]', error);
    return res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
}
