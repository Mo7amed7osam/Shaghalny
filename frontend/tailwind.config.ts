import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        brand: {
          50: '#eef0ff',
          100: '#e0e3ff',
          200: '#c8ceff',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        accent: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        ink: {
          50: '#fbfbfc',
          100: '#f4f4f7',
          200: '#ececf0',
          300: '#d8d8df',
          400: '#b6b6c0',
          500: '#6b6b76',
          600: '#54545f',
          700: '#3b3b44',
          800: '#25252c',
          900: '#16161a',
          950: '#0a0a0e',
          dark: {
            bg: '#0a0a0e',
            surface: '#141419',
            border: '#282830',
            text: '#f3f3f6',
            muted: '#a1a1ad',
          },
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16,16,20,0.04)',
        card: '0 1px 2px rgba(16,16,20,0.04)',
        elevated: '0 18px 42px -24px rgba(16,16,20,0.22), 0 1px 2px rgba(16,16,20,0.04)',
        glass: '0 18px 46px -24px rgba(99,102,241,0.46), 0 1px 2px rgba(16,16,20,0.06)',
        'dark-card': '0 1px 2px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
