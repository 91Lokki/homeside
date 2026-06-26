import type { Config } from 'tailwindcss'

/**
 * Design system: gallery-white & calm.
 *
 * The ONLY strong hue on screen is the current home team's color, exposed as the
 * CSS variable `--team` (set at runtime). Everything else is a neutral grayscale
 * ramp. No gradients, no shadows — softness comes from whitespace and hairlines.
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // Replace Tailwind's default shadow scale with "nothing" — the design forbids
    // drop shadows. Depth is communicated with 1px borders instead.
    boxShadow: {
      none: 'none',
      // a single, almost-invisible lift used very sparingly (e.g. the floating nav)
      hair: '0 1px 0 0 var(--hairline)',
      DEFAULT: 'none',
      sm: 'none',
      md: 'none',
      lg: 'none',
      xl: 'none',
    },
    extend: {
      fontFamily: {
        // Space Grotesk for latin + numbers, Noto Sans TC for Chinese.
        sans: [
          '"Space Grotesk"',
          '"Noto Sans TC"',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        grotesk: ['"Space Grotesk"', 'sans-serif'],
        tc: ['"Noto Sans TC"', 'sans-serif'],
      },
      colors: {
        // Surfaces & ink read from CSS vars so dark mode is a single source of truth.
        canvas: 'var(--canvas)',
        surface: 'var(--surface)',
        sunken: 'var(--sunken)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        faint: 'var(--faint)',
        hairline: 'var(--hairline)',
        // The single accent — the team color and a soft tint of it.
        team: 'var(--team)',
        'team-pure': 'var(--team-pure)',
        'team-soft': 'var(--team-soft)',
        'team-ink': 'var(--team-ink)',
      },
      borderColor: {
        DEFAULT: 'var(--hairline)',
      },
      borderRadius: {
        // Deliberately varied (not one uniform radius everywhere) to avoid the
        // templated look. Components opt into the size that fits them.
        card: '18px',
        pill: '999px',
      },
      fontSize: {
        // A tighter, more editorial type scale.
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.04em' }],
      },
      letterSpacing: {
        label: '0.08em',
      },
      transitionTimingFunction: {
        calm: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
      keyframes: {
        'breathe': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-1.5%) scale(1.012)' },
        },
        'blink': {
          '0%, 92%, 100%': { transform: 'scaleY(1)' },
          '96%': { transform: 'scaleY(0.1)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'rise': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'radar': {
          from: { opacity: '0', transform: 'scale(0.82)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'live-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        breathe: 'breathe 6s var(--ease-calm, ease-in-out) infinite',
        blink: 'blink 7s ease-in-out infinite',
        'fade-in': 'fade-in 0.6s var(--ease-calm, ease-out) both',
        rise: 'rise 0.7s var(--ease-calm, ease-out) both',
        radar: 'radar 0.7s var(--ease-calm, ease-out) both',
        'live-pulse': 'live-pulse 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
