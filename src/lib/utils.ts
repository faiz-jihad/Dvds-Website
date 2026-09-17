import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validates and sanitizes internal redirect URLs to prevent Open Redirect vulnerabilities.
 * Only allows safe relative paths that start with a single '/' and do not contain protocols,
 * authority indicators, or backslashes.
 */
export function sanitizeRedirectPath(path: string | null | undefined, fallback = '/account'): string {
  if (!path || typeof path !== 'string') return fallback;
  const trimmed = path.trim();
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)
  ) {
    return fallback;
  }
  return trimmed;
}

export default cn;
