import { generateDynamicRobots, getBaseUrl } from './_seo-renderer.js';

export default async function handler(req, res) {
  try {
    const baseUrl = getBaseUrl(req);
    const robots = generateDynamicRobots(baseUrl);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(robots);
  } catch (error) {
    console.error('[API robots error]', error);
    return res.status(500).send('User-agent: *\nAllow: /\n');
  }
}
