import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-base': 'var(--color-bg-base)',
        'bg-panel': 'var(--color-bg-panel)',
        'bg-panel-2': 'var(--color-bg-panel-2)',
        'accent-red': 'var(--color-accent-red)',
        'accent-red-deep': 'var(--color-accent-red-deep)',
        'text-hi': 'var(--color-text-hi)',
        'text-mid': 'var(--color-text-mid)',
        'text-dim': 'var(--color-text-dim)',
        line: 'var(--color-line)',
        'priority-high': 'var(--color-priority-high)',
        'priority-med': 'var(--color-priority-med)',
        'priority-low': 'var(--color-priority-low)',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--border))',
        ring: 'hsl(var(--ring))',
      },
      fontFamily: {
        display: ['Anton', 'Bebas Neue', 'Impact', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-2xl': ['var(--text-display-2xl)', { lineHeight: 'var(--leading-display)' }],
        'display-xl': ['var(--text-display-xl)', { lineHeight: 'var(--leading-display)' }],
        'display-lg': ['var(--text-display-lg)', { lineHeight: 'var(--leading-tight)' }],
        'chapter-num': ['var(--text-chapter-num)', { lineHeight: '1' }],
        'body-lg': ['var(--text-body-lg)', { lineHeight: 'var(--leading-body)' }],
        'body-md': ['var(--text-body-md)', { lineHeight: 'var(--leading-body)' }],
        'body-sm': ['var(--text-body-sm)', { lineHeight: '1.5' }],
        label: ['var(--text-label)', { lineHeight: '1.4' }],
        kicker: ['var(--text-kicker)', { lineHeight: '1' }],
      },
      letterSpacing: {
        display: 'var(--tracking-display)',
        kicker: 'var(--tracking-kicker)',
        label: 'var(--tracking-label)',
      },
      backgroundImage: {
        vignette: 'radial-gradient(ellipse at center, transparent 40%, rgba(10,10,11,0.85) 100%)',
        'vignette-heavy':
          'radial-gradient(ellipse at center, transparent 20%, rgba(10,10,11,0.95) 100%)',
      },
      boxShadow: {
        'red-glow': '0 0 24px 4px rgba(225,6,0,0.35)',
        'red-glow-sm': '0 0 12px 2px rgba(225,6,0,0.25)',
      },
      width: { 'brand-rail': 'var(--brand-rail-width)' },
      height: { 'transport-bar': 'var(--transport-bar-height)' },
      borderColor: { DEFAULT: 'hsl(var(--border))' },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
