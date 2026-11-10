import defaultColors from 'tailwindcss/colors.js';
import plugin from 'tailwindcss/plugin.js';

/*
 * Theme colours are CSS variables so every utility (bg-slate-50, text-emerald-700, …)
 * flips automatically when <html> gets the `dark` class. Light values are the usual
 * Tailwind palette; dark values are derived below so tints stay tints and text stays
 * readable on the dark surfaces.
 */

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a, b, t) => {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return A.map((v, i) => Math.round(v * t + B[i] * (1 - t)));
};
const triplet = (v) => (Array.isArray(v) ? v : hexToRgb(v)).join(' ');

// Dark surfaces, sampled from the CampusHub reference.
const DARK_SURFACE = '#1f1f24';

// Neutral scale (replaces slate/gray/zinc/neutral everywhere).
const NEUTRAL_LIGHT = {
  50: '#f7f6f3', 100: '#efeeea', 200: '#e4e2dd', 300: '#d1cec8', 400: '#a3a09a', 500: '#75736e',
  600: '#57554f', 700: '#403e3a', 800: '#2a2926', 900: '#1a1a18', 950: '#0e0e0d',
};
const NEUTRAL_DARK = {
  50: '#26262c', 100: '#2c2c33', 200: '#34343c', 300: '#45454e', 400: '#6e6e78', 500: '#92929c',
  600: '#adadb6', 700: '#c9c9d0', 800: '#e1e1e6', 900: '#f2f2f5', 950: '#fafafa',
};

// Coral accent, sampled from the CampusHub reference (#e05252).
const BRAND_LIGHT = {
  50: '#fdf2f2', 100: '#fbe3e3', 200: '#f6c7c7', 300: '#ef9f9f', 400: '#e77272', 500: '#e05252',
  600: '#cc3d3d', 700: '#ab3030', 800: '#8c2a2a', 900: '#742828', 950: '#3f1111',
};
const BRAND_DARK = {
  50: '#2c1a1c', 100: '#3a1f21', 200: '#5a2728', 300: '#8a3535', 400: '#c84848', 500: '#e05252',
  600: '#e45c5c', 700: '#ea6c6c', 800: '#f19494', 900: '#f6b8b8', 950: '#fde8e8',
};

// Semantic palettes: dark mode keeps 400–600 as-is (solid fills with white text still
// read), turns light tints into dark tints and dark text into light text.
const darkFor = (p) => ({
  50: mix(p[900], DARK_SURFACE, 0.22),
  100: mix(p[900], DARK_SURFACE, 0.4),
  200: mix(p[800], DARK_SURFACE, 0.55),
  300: mix(p[700], DARK_SURFACE, 0.8),
  400: p[400],
  500: p[500],
  600: p[500],
  700: p[400],
  800: p[300],
  900: p[200],
  950: p[100],
});

const SEMANTIC = [
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky',
  'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
];

const palettes = {
  slate: [NEUTRAL_LIGHT, NEUTRAL_DARK],
  brand: [BRAND_LIGHT, BRAND_DARK],
};
SEMANTIC.forEach((name) => {
  palettes[name] = [defaultColors[name], darkFor(defaultColors[name])];
});

const varColor = (name) =>
  Object.fromEntries(SHADES.map((s) => [s, `rgb(var(--c-${name}-${s}) / <alpha-value>)`]));

const colors = {};
Object.keys(palettes).forEach((name) => {
  colors[name] = varColor(name);
});
// Every grey alias points at the same neutral scale.
colors.gray = colors.slate;
colors.zinc = colors.slate;
colors.neutral = colors.slate;
colors.stone = colors.slate;

const lightVars = {};
const darkVars = {};
Object.entries(palettes).forEach(([name, [light, dark]]) => {
  SHADES.forEach((s) => {
    lightVars[`--c-${name}-${s}`] = triplet(light[s]);
    darkVars[`--c-${name}-${s}`] = triplet(dark[s]);
  });
});

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        wordmark: ['"M PLUS Rounded 1c"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ...colors,
        surface: 'rgb(var(--surface) / <alpha-value>)',
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        // MLRIT logo colours, fixed in both themes.
        mlrit: {
          green: '#1c6740',
          leaf: '#8dc04a',
          orange: '#ed7a1d',
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.03), 0 1px 3px rgb(0 0 0 / 0.04)',
        'card-hover': '0 10px 28px -14px rgb(0 0 0 / 0.18), 0 2px 6px rgb(0 0 0 / 0.04)',
        pop: '0 24px 64px -16px rgb(0 0 0 / 0.28), 0 4px 12px rgb(0 0 0 / 0.08)',
        glow: '0 0 0 4px rgb(var(--c-brand-500) / 0.14)',
      },
      animation: {
        shimmer: 'shimmer 1.6s ease-in-out infinite',
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({
        ':root': { ...lightVars, '--surface': '255 255 255', '--canvas': '247 246 243' },
        '.dark': { ...darkVars, '--surface': triplet(DARK_SURFACE), '--canvas': '11 11 13' },
      });
    }),
  ],
};
