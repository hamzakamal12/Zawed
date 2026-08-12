import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep teal — institutional, trustworthy. Sells to NGOs and banks.
        primary: {
          50: '#f0f9fa',
          100: '#d9eff1',
          200: '#b7e0e4',
          300: '#86c9d1',
          400: '#4daab6',
          500: '#2d8d9b',
          600: '#0d5c63',
          700: '#134e56',
          800: '#154149',
          900: '#16373e',
          950: '#072429',
        },
        // Single accent, reserved for emphasis (not decoration).
        accent: {
          50: '#fdf8ed',
          100: '#f8ecce',
          400: '#e5b567',
          500: '#d4a24e',
          600: '#b8863b',
        },
        ink: '#0f2b34',
        muted: '#5b6b70',
        line: '#e3eaec',
      },
      fontFamily: {
        sans: ['Cairo', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: { xl: '0.9rem' },
    },
  },
  plugins: [],
} satisfies Config
