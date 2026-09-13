import React, { useEffect } from 'react';

type JsonLd = Record<string, unknown> | Record<string, unknown>[];

interface SeoProps {
  title: string;
  description?: string;
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

const absoluteUrl = (value: string | undefined, baseUrl: string) => {
  if (!value) return undefined;
  try {
    return new URL(value, `${baseUrl}/`).toString();
  } catch {
    return undefined;
  }
};

export const Seo: React.FC<SeoProps> = ({
  title,
  description,
  siteName,
  siteUrl,
  canonicalPath,
  image,
  type = 'website',
  noIndex = false,
  jsonLd,
}) => {
  useEffect(() => {
    const baseUrl = (siteUrl || window.location.origin).replace(/\/$/, '');
    const canonicalUrl = absoluteUrl(canonicalPath || window.location.pathname, baseUrl);
    const socialImage = absoluteUrl(image, baseUrl);
    const robots = noIndex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', robots);
    upsertMeta('name', 'googlebot', robots);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:site_name', siteName);
    upsertMeta('property', 'og:locale', 'en_GB');
    upsertMeta('property', 'og:image', socialImage);
    upsertMeta('name', 'twitter:card', socialImage ? 'summary_large_image' : 'summary');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', socialImage);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonicalUrl) {
      canonical ||= document.createElement('link');
      canonical.rel = 'canonical';
      canonical.href = canonicalUrl;
      if (!canonical.parentNode) document.head.appendChild(canonical);
    } else {
      canonical?.remove();
    }

    const scriptId = 'page-structured-data';
    document.getElementById(scriptId)?.remove();
    if (jsonLd && !noIndex) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(jsonLd).replace(/</g, '\\u003c');
      document.head.appendChild(script);
    }

    return () => document.getElementById(scriptId)?.remove();
  }, [canonicalPath, description, image, jsonLd, noIndex, siteName, siteUrl, title, type]);

  return null;
};
