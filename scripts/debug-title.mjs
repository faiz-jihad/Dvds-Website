import fs from 'node:fs';
import { injectSeoTags } from '../api/_seo-renderer.js';

async function main() {
  const html = fs.readFileSync('./dist/index.html', 'utf8');
  console.log('HTML raw title:', html.match(/<title>[^<]+<\/title>/)?.[0]);
  const res = await injectSeoTags(html, '/');
  console.log('Rendered title:', res.html.match(/<title>[^<]+<\/title>/)?.[0]);
}

main().catch(console.error);
