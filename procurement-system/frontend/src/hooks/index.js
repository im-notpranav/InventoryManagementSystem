import { useEffect, useState, useCallback, useRef } from 'react';

/** Respect the OS "reduce motion" preference. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return undefined;
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);
  return reduced;
}

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const handler = (e) => setMatches(e.matches);
    setMatches(mq.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, [query]);
  return matches;
}

export function useDebounce(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Simple async-data hook with refetch + settled state. */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const alive = useRef(true);
  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fn();
      if (alive.current) setState({ data, loading: false, error: null });
    } catch (error) {
      if (alive.current) setState({ data: null, loading: false, error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    alive.current = true;
    run();
    return () => {
      alive.current = false;
    };
  }, [run]);
  return { ...state, refetch: run };
}

/** Close on Escape / click outside. */
export function useDismiss(ref, onDismiss, active = true) {
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => e.key === 'Escape' && onDismiss?.();
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onDismiss?.();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [ref, onDismiss, active]);
}

export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [key, value]);
  return [value, setValue];
}

/** Global keyboard shortcut (e.g. "k" with ctrl/meta). */
export function useHotkey(key, handler, { meta = true } = {}) {
  useEffect(() => {
    const onKey = (e) => {
      const modifier = meta ? e.ctrlKey || e.metaKey : true;
      if (modifier && e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        handler(e);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [key, handler, meta]);
}
