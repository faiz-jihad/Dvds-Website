/**
 * SEO & Canonical URL Helpers
 * Dynamically resolves site base URL and absolute paths without hardcoding.
 */

export const DEFAULT_PRODUCTION_SITE_URL = 'https://dvds-zone.co.uk';

export const getSiteBaseUrl = (): string => {
  const envUrl = (import.meta as any)?.env?.VITE_SITE_URL;
  if (envUrl) {
    return String(envUrl).replace(/\/$/, '').replace(/^https?:\/\/www\.dvds-zone\.co\.uk$/i, DEFAULT_PRODUCTION_SITE_URL);
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/$/, '');
    if (/^https?:\/\/(www\.)?dvds-?zone\.co\.uk$/i.test(origin)) {
      return DEFAULT_PRODUCTION_SITE_URL;
    }
    return origin;
  }
  return DEFAULT_PRODUCTION_SITE_URL;
};

export const toAbsoluteUrl = (path: string | undefined | null, fallbackBase?: string): string => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;

  const base = (fallbackBase?.replace(/\/$/, '') || getSiteBaseUrl() || DEFAULT_PRODUCTION_SITE_URL).replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};
