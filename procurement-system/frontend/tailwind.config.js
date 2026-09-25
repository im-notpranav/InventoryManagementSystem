/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['Sora', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        brand: {
          50: '#eef5fc',
          100: '#d8e8f7',
          200: '#b3d0ee',
          300: '#7fb0e0',
          400: '#4f8fc0',
          500: '#2e75b6',
          600: '#245f95',
          700: '#1e3a5f',
          800: '#172d4a',
          900: '#0f172a',
        },
        inventbot: {
          dark: '#1e3a5f',
          DEFAULT: '#2e75b6',
          light: '#4f8fc0',
          bg: '#e8f1fb',
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)',
        'card-hover': '0 12px 32px -12px rgba(15, 23, 42, 0.18), 0 2px 6px rgba(15, 23, 42, 0.06)',
        pop: '0 24px 64px -16px rgba(15, 23, 42, 0.28), 0 4px 12px rgba(15, 23, 42, 0.08)',
        glow: '0 0 0 4px rgba(46, 117, 182, 0.14)',
      },
      animation: {
        'star-movement-bottom': 'star-movement-bottom linear infinite alternate',
        'star-movement-top': 'star-movement-top linear infinite alternate',
        shimmer: 'shimmer 1.6s ease-in-out infinite',
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        'star-movement-bottom': {
          '0%': { transform: 'translate(0%, 0%)', opacity: '1' },
          '100%': { transform: 'translate(-100%, 0%)', opacity: '0' },
        },
        'star-movement-top': {
          '0%': { transform: 'translate(0%, 0%)', opacity: '1' },
          '100%': { transform: 'translate(100%, 0%)', opacity: '0' },
        },
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
  plugins: [],
};
