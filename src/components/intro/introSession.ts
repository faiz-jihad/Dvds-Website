export const INTRO_SESSION_KEY = 'az-rayan:intro:v1';
let completedInMemory = false;

export function shouldPlayIntro(home: boolean): boolean {
  if (!home || typeof window === 'undefined' || completedInMemory) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try { return window.sessionStorage.getItem(INTRO_SESSION_KEY) !== 'seen'; }
  catch { return true; }
}

export function rememberIntro() {
  completedInMemory = true;
  try { window.sessionStorage.setItem(INTRO_SESSION_KEY, 'seen'); }
  catch { /* Storage can be unavailable in private browsing; memory still prevents replay. */ }
}
