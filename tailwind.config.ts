import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        brand: {
          navy: '#0F172A',
          blue: '#0369A1',
          light: '#F0F9FF',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 24px -4px rgba(0,0,0,0.10), 0 4px 8px -4px rgba(0,0,0,0.06)',
        'sidebar': '1px 0 0 0 #e2e8f0',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #0F172A 0%, #1e3a8a 50%, #0369A1 100%)',
        'card-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'stat-blue': 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)',
        'stat-green': 'linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)',
        'stat-amber': 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)',
        'stat-purple': 'linear-gradient(135deg, #ede9fe 0%, #faf5ff 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}

export default config
