import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import vm from 'node:vm';
import path from 'node:path';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
let compiled;
async function renderHomepage(config) {
  if (!compiled) {
    const result = await build({ entryPoints: ['src/pages/Home.tsx'], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
      plugins: [{ name: 'homepage-render', setup(b) {
        b.onResolve({ filter: /^lucide-react$/ }, () => ({ path: path.resolve('node_modules/lucide-react/dist/esm/lucide-react.js') }));
        b.onResolve({ filter: /^react$/ }, () => ({ path: 'react', external: true }));
        b.onResolve({ filter: /\/Spyker\w+$/ }, ({ path }) => ({ path: path.split('/').at(-1), namespace: 'spyker' }));
        b.onLoad({ filter: /.*/, namespace: 'spyker' }, ({ path }) => ({ contents: `import React from 'react'; export const ${path} = () => React.createElement('div', null, 'Starter ${path}');` }));
        // Use the real section dispatcher, including enabled/date checks, with lightweight section views.
        b.onResolve({ filter: /\/(Hero|Featured|ProductRail|CategoryGrid|Editorial|Spotlight|Campaign|Newsletter)Section$/ }, ({ path }) => ({ path: path.split('/').at(-1), namespace: 'section' }));
        b.onLoad({ filter: /.*/, namespace: 'section' }, ({ path }) => ({ contents: `import React from 'react'; export const ${path} = ({data}) => React.createElement('section', null, data.title);` }));
        b.onResolve({ filter: /^@tanstack\/react-query$/ }, () => ({ path: 'query', namespace: 'mock' }));
        b.onResolve({ filter: /\/(publicApi|homepageApi|Seo|AnimatedContent)$/ }, ({ path }) => ({ path: path.split('/').at(-1), namespace: 'mock' }));
        b.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: {
          query: "export const useQuery = ({queryKey}) => ({data: queryKey[0] === 'homepage' ? globalThis.config : []});",
          publicApi: 'export const publicApi = {};', homepageApi: 'export const homepageApi = {};',
          Seo: 'export const Seo = () => null;', AnimatedContent: 'export const AnimatedContent = ({children}) => children;',
        }[path] }));
      } }],
    });
    compiled = result.outputFiles[0].text;
  }
  const context = { module: { exports: {} }, require, config };
  vm.runInNewContext(compiled, context);
  return renderToStaticMarkup(React.createElement(context.module.exports.Home));
}

test('published homepage renders every builder section in saved order, respecting visibility and schedule', async () => {
  const types = ['hero', 'featured', 'productRail', 'categoryGrid', 'editorial', 'spotlight', 'campaign', 'newsletter'];
  const sections = types.map((type, index) => ({ id: type, type, enabled: true, sortOrder: index, data: { title: `Saved ${type}` } }));
  const html = await renderHomepage({ status: 'published', sections: [
    ...sections.toReversed(),
    { ...sections[0], id: 'hidden', enabled: false, data: { title: 'HIDDEN' } },
    { ...sections[0], id: 'future', startsAt: '2999-01-01', data: { title: 'FUTURE' } },
    { ...sections[0], id: 'expired', endsAt: '2000-01-01', data: { title: 'EXPIRED' } },
  ] });
  let previous = -1;
  for (const type of types) {
    const index = html.indexOf(`Saved ${type}`);
    assert.ok(index > previous, `${type} must appear in saved order`);
    previous = index;
  }
  for (const hidden of ['Starter Spyker', 'HIDDEN', 'FUTURE', 'EXPIRED']) assert.ok(!html.includes(hidden));
});

test('existing storefront template remains until first publish and an empty published layout stays empty', async () => {
  assert.ok((await renderHomepage({ status: 'draft', sections: [] })).includes('Starter SpykerHero'));
  const published = await renderHomepage({ status: 'published', sections: [] });
  assert.ok(!published.includes('Starter Spyker'));
});
