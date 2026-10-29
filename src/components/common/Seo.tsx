import React, { useEffect } from 'react';

type JsonLd = Record<string, unknown> | Record<string, unknown>[];

interface SeoProps {
  title: string;
  description?: string;
  keywords?: string;
  siteName?: string;
  siteUrl?: string;
  canonicalPath?: string;
  image?: string;
  type?: 'website' | 'product';
  noIndex?: boolean;
  jsonLd?: JsonLd;
}

const upsertMeta = (attribute: 'name' | 'property', key: string, content?: string) => {
  const selector = `meta[${attribute}="${key}"]`;
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  if (!content) {
    existing?.remove();
    return;
  }
  const element = existing || document.createElement('meta');
  element.setAttribute(attribute, key);
  element.content = content;
  if (!existing) document.head.appendChild(element);
};

const upsertLink = (rel: string, href?: string, extraAttrs?: Record<string, string>) => {
  let selector = `link[rel="${rel}"]`;
  if (extraAttrs?.hreflang) {
    selector = `link[rel="${rel}"][hreflang="${extraAttrs.hreflang}"]`;
  }
  const matches = Array.from(document.head.querySelectorAll<HTMLLinkElement>(selector));
  const existing = matches[0];
  // Remove any accidental duplicate link declarations
  if (matches.length > 1) {
    matches.slice(1).forEach((el) => el.remove());
  }
  if (!href) {
    existing?.remove();
    return;
  }
  const element = existing || document.createElement('link');
  element.rel = rel;
  element.href = href;
  if (extraAttrs) {
    Object.entries(extraAttrs).forEach(([k, v]) => element.setAttribute(k, v));
  }
  if (!existing) document.head.appendChild(element);
};

import { getSiteBaseUrl, toAbsoluteUrl } from '../../lib/seo';
export { getSiteBaseUrl, toAbsoluteUrl };

export const Seo: React.FC<SeoProps> = ({
  title,
  description,
  keywords,
  siteName = 'DVD zone UK',
  siteUrl,
  canonicalPath,
  image,
  type = 'website',
  noIndex = false,
  jsonLd,
}) => {
  useEffect(() => {
    const baseUrl = (siteUrl || getSiteBaseUrl()).replace(/\/$/, '');
    const canonicalUrl = toAbsoluteUrl(canonicalPath || (typeof window !== 'undefined' ? window.location.pathname : '/'), baseUrl);
    const socialImage = image ? toAbsoluteUrl(image, baseUrl) : undefined;
    const robots = noIndex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

    // Formatted page title
    const fullTitle = title.includes('DVD zone') || title.includes('DVD Zone') || title.includes('DVDs Zone') || title.includes('DVD') ? title : `${title} — DVD zone UK`;
    document.title = fullTitle;

    upsertMeta('name', 'description', description);
    upsertMeta('name', 'keywords', keywords);
    upsertMeta('name', 'robots', robots);
    upsertMeta('name', 'googlebot', robots);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:site_name', siteName);
    upsertMeta('property', 'og:locale', 'en_GB');
    upsertMeta('property', 'og:image', socialImage);
    upsertMeta('name', 'twitter:card', socialImage ? 'summary_large_image' : 'summary');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', socialImage);

    // Canonical link (single authoritative declaration)
    upsertLink('canonical', canonicalUrl, { 'data-ssr': 'true' });

    // Hreflang alternates for UK & Global English
    if (canonicalUrl && !noIndex) {
      upsertLink('alternate', canonicalUrl, { hreflang: 'en-GB' });
      upsertLink('alternate', canonicalUrl, { hreflang: 'x-default' });
    } else if (noIndex) {
      upsertLink('alternate', undefined, { hreflang: 'en-GB' });
      upsertLink('alternate', undefined, { hreflang: 'x-default' });
    }

    // Dynamic Schema.org JSON-LD
    const scriptId = 'page-structured-data';
    document.getElementById(scriptId)?.remove();
    if (jsonLd && !noIndex) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(jsonLd).replace(/</g, '\\u003c');
      document.head.appendChild(script);
    }

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [canonicalPath, description, image, jsonLd, keywords, noIndex, siteName, siteUrl, title, type]);

  return null;
};
