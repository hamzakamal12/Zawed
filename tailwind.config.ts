import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'

/**
 * Palette notes — the colour choices here were validated with the dataviz
 * skill's checker rather than picked by eye:
 *
 *  - The previous brand teal (#0d5c63) FAILED the chroma floor at 0.07, i.e.
 *    it literally "reads gray". The ramp below is re-anchored on #0aa2ab,
 *    which clears the floor and still holds ≥3:1 on white.
 *  - Steps 400→800 pass the ordinal ramp checks (monotone lightness, ≥0.06
 *    gaps, light end ≥2:1 on white, single hue) so they are safe as chart marks.
 *  - The gold accent was darkened from #d4a24e (2.31:1 — under the 3:1 floor)
 *    to #b8801f, which passes.
 *  - `status` is the skill's fixed status palette; it is never reused as a
 *    series colour and always ships with an icon or label beside it.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eafafa',
          100: '#cdf2f4',
          200: '#9de7ea',
          300: '#5fd5db',
          400: '#22bcc5',
          500: '#0aa2ab',
          600: '#0b8a92',
          700: '#0a6d74',
          800: '#08525a',
          900: '#0a444a',
          950: '#042c31',
        },
        accent: {
          50: '#fdf6e9',
          100: '#f8e8c6',
          200: '#f0d08c',
          300: '#e3b355',
          400: '#d29a2f',
          500: '#b8801f',
          600: '#96661a',
          700: '#754e16',
        },
        // Status — fixed, never themed, never a series colour.
        status: {
          good: '#0ca30c',
          warning: '#fab219',
          serious: '#ec835a',
          critical: '#d03b3b',
        },
        // Warm neutrals read less clinical than pure slate.
        ink: '#12211f',
        muted: '#5d6b69',
        line: '#e4eceb',
        surface: '#ffffff',
        canvas: '#f6faf9',
      },
      fontFamily: {
        sans: ['Cairo', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: { xl: '0.9rem', '2xl': '1.15rem' },
      boxShadow: {
        card: '0 1px 2px rgba(18,33,31,.05), 0 1px 3px rgba(18,33,31,.04)',
        lift: '0 8px 24px -6px rgba(11,138,146,.18), 0 2px 8px rgba(18,33,31,.06)',
        glow: '0 0 0 4px rgba(10,162,171,.12)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .35s cubic-bezier(.16,1,.3,1) both',
      },
    },
  },
  plugins: [
    /**
     * `touch:` — styles that apply only when the pointer is a fingertip.
     *
     * The 44×44 minimum target is a TOUCH rule: a fingertip contact patch is
     * about 9mm, a mouse cursor is one pixel. Growing every control to 44px
     * unconditionally would pad out the dense admin tables for people who do
     * not need it, so the size bump is scoped to coarse pointers.
     *
     * Tailwind only ships `pointer-coarse` from v4; this is the v3 equivalent.
     */
    plugin(({ addVariant }) => {
      addVariant('touch', '@media (pointer: coarse)')
    }),
  ],
} satisfies Config
