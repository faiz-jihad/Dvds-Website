import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#1769E0',
          'blue-hover': '#1256BA',
          'blue-soft': '#EAF2FF',
          red: '#E62832',
          'red-hover': '#C91D27',
          'red-soft': '#FDECEE',
        },
        dark: {
          DEFAULT: '#111111',
          soft: '#1B1B1B',
          surface: '#171717',
        },
        gray: {
          50: '#F8F8F8',
          100: '#F2F2F2',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#777777',
          600: '#525252',
          700: '#444444',
          800: '#262626',
          900: '#171717',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Manrope', 'Inter', 'sans-serif'],
      },
      maxWidth: {
        container: '1360px',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
      },
      boxShadow: {
        'dvd-subtle': '0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'dvd-hover': '0 16px 32px -4px rgba(0, 0, 0, 0.12), 0 4px 8px -2px rgba(0, 0, 0, 0.06)',
        'disc': '0 0 40px rgba(23, 105, 224, 0.15)',
      },
      aspectRatio: {
        'dvd': '2 / 3',
        'dvd-case': '0.71 / 1',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '250ms',
        'editorial': '600ms',
      },
    },
  },
  plugins: [],
} satisfies Config;
