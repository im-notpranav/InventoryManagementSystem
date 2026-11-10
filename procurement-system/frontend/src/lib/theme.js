import { create } from 'zustand';

const KEY = 'mlrit_theme';
const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

const stored = () => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'dark' || v === 'light' ? v : null;
  } catch {
    return null;
  }
};

const systemTheme = () => (media?.matches ? 'dark' : 'light');

const applyClass = (theme) => {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b0b0d' : '#f7f6f3');
};

export const useTheme = create((set, get) => ({
  theme: stored() || systemTheme(),
  setTheme: (theme, { persist = true } = {}) => {
    if (persist) {
      try {
        localStorage.setItem(KEY, theme);
      } catch {
        /* storage blocked: theme still applies for this visit */
      }
    }
    applyClass(theme);
    set({ theme });
  },
  toggle: (origin) => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    liquidSwitch(() => get().setTheme(next), origin);
  },
}));

// Follow the OS until the user picks a theme themselves.
media?.addEventListener('change', (e) => {
  if (!stored()) useTheme.getState().setTheme(e.matches ? 'dark' : 'light', { persist: false });
});

/*
 * Liquid wave wipe. The new theme is captured by the View Transitions API and revealed
 * through a clip-path whose leading edge is a cubic curve that bends as it travels, so
 * the boundary looks like a wave rolling across the screen.
 */
function wavePath(W, H, lead, bendA, bendB, fromRight) {
  const far = -W * 2;
  const top = lead;
  const bottom = lead - W * 0.32;
  const c1x = lead + W * bendA;
  const c2x = lead - W * bendB;
  const X = (x) => (fromRight ? W - x : x);
  const pts = [
    `M ${X(far)} -20`,
    `L ${X(top)} -20`,
    `C ${X(c1x)} ${H * 0.35} ${X(c2x)} ${H * 0.62} ${X(bottom)} ${H + 20}`,
    `L ${X(far)} ${H + 20}`,
    'Z',
  ];
  return `path('${pts.join(' ')}')`;
}

function liquidSwitch(apply, origin) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduced) {
    apply();
    return;
  }
  const W = window.innerWidth;
  const H = window.innerHeight;
  const fromRight = origin ? origin.x > W / 2 : true;

  const root = document.documentElement;
  root.classList.add('theme-switching');
  const transition = document.startViewTransition(apply);
  transition.ready
    .then(() => {
      // [lead position, top bulge, lower counter-bulge] per keyframe
      const steps = [
        [-0.45, 0.1, 0.05],
        [0.15, 0.3, 0.22],
        [0.7, 0.24, 0.34],
        [1.25, 0.16, 0.24],
        [1.75, 0.08, 0.1],
      ];
      root.animate(
        { clipPath: steps.map(([p, a, b]) => wavePath(W, H, p * W, a, b, fromRight)) },
        { duration: 850, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    })
    .catch(() => {});
  transition.finished.finally(() => root.classList.remove('theme-switching'));
}
