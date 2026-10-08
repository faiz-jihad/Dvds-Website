import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
let compiled;
async function renderHomepage(config) {
  if (!compiled) {
    const result = await build({
      entryPoints: ["src/components/homepage/HomepageSectionRenderer.tsx"],
      bundle: true,
      write: false,
      platform: "node",
      format: "cjs",
      packages: "external",
      plugins: [
        {
          name: "homepage-render",
          setup(b) {
            b.onResolve({ filter: /^react$/ }, () => ({
              path: "react",
              external: true,
            }));
            b.onResolve(
              {
                filter:
                  /\/(Hero|Featured|ProductRail|CategoryGrid|Editorial|Spotlight|Campaign|Newsletter)Section$/,
              },
              ({ path }) => ({
                path: path.split("/").at(-1),
                namespace: "section",
              }),
            );
            b.onLoad({ filter: /.*/, namespace: "section" }, ({ path }) => ({
              contents: `import React from 'react'; export const ${path} = ({data}) => React.createElement('section', null, data?.title || '${path}');`,
            }));
          },
        },
      ],
    });
    compiled = result.outputFiles[0].text;
  }
  const context = { module: { exports: {} }, require };
  vm.runInNewContext(compiled, context);
  const Renderer = context.module.exports.HomepageSectionRenderer;
  const sections = (config?.sections || [])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const elements = sections.map((sec) =>
    React.createElement(Renderer, {
      key: sec.id,
      section: sec,
      products: [],
      categories: [],
    })
  );
  return renderToStaticMarkup(React.createElement("div", null, ...elements));
}

test("published homepage renders every builder section in saved order, respecting visibility and schedule", async () => {
  const types = [
    "hero",
    "featured",
    "productRail",
    "categoryGrid",
    "editorial",
    "spotlight",
    "campaign",
    "newsletter",
  ];
  const sections = types.map((type, index) => ({
    id: type,
    type,
    enabled: true,
    sortOrder: index,
    data: { title: `Saved ${type}` },
  }));
  const html = await renderHomepage({
    status: "published",
    sections: [
      ...sections.toReversed(),
      {
        ...sections[0],
        id: "hidden",
        enabled: false,
        data: { title: "HIDDEN" },
      },
      {
        ...sections[0],
        id: "future",
        startsAt: "2999-01-01",
        data: { title: "FUTURE" },
      },
      {
        ...sections[0],
        id: "expired",
        endsAt: "2000-01-01",
        data: { title: "EXPIRED" },
      },
    ],
  });
  let previous = -1;
  for (const type of types) {
    const index = html.indexOf(`Saved ${type}`);
    assert.ok(index > previous, `${type} must appear in saved order`);
    previous = index;
  }
  for (const hidden of ["HIDDEN", "FUTURE", "EXPIRED"])
    assert.ok(!html.includes(hidden));
});

test("storefront retains signature cinematic experience", () => {
  const source = readFileSync(
    new URL("../src/pages/Home.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(source.includes("AzDarkLandingLayout"));
  const layout = readFileSync(
    new URL("../src/components/landing/AzDarkLandingLayout.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(layout.includes("AzCinematicHero"));
});

test("ScrollExpand does not trigger an undefined progress state loop", () => {
  const source = readFileSync(
    new URL("../src/components/motion/ScrollExpand.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /\bsetProgress\s*\(/);
});
