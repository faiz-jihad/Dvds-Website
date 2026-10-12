/**
 * SEO & Canonical URL Helpers
 * Dynamically resolves site base URL and absolute paths without hardcoding.
 */

export const getSiteBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  const envUrl = (import.meta as any)?.env?.VITE_SITE_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  return '';
};

export const toAbsoluteUrl = (path: string | undefined | null, fallbackBase?: string): string => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;

  const base = fallbackBase?.replace(/\/$/, '') || getSiteBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${cleanPath}` : cleanPath;
};
