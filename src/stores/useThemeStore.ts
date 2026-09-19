import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light';

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'dvds_theme_mode';

const applyThemeToDocument = (theme: ThemeMode) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    document.body.classList.add('dark');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    document.body.classList.remove('dark');
  }
};

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      applyThemeToDocument(saved);
      return saved;
    }
  } catch {
    // fallback
  }
  applyThemeToDocument('dark');
  return 'dark';
};

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitialTheme(),
  setTheme: (theme: ThemeMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
    applyThemeToDocument(theme);
    set({ theme });
  },
  toggleTheme: () => {
    set((state) => {
      const nextTheme: ThemeMode = state.theme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY, nextTheme);
      } catch {
        // ignore
      }
      applyThemeToDocument(nextTheme);
      return { theme: nextTheme };
    });
  },
}));
