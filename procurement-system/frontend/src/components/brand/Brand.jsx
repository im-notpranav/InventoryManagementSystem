import { MARK_ARROW, MARK_GEAR, MLRIT_GREEN, MLRIT_LEAF } from './markPaths';
import { cn } from '../../lib/utils';

/** The MLRIT gear-and-arrow mark in its official colours. */
export function MlritMark({ className, title = 'MLRIT' }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={title}>
      <path fill={MLRIT_GREEN} fillRule="evenodd" d={MARK_GEAR} />
      <path fill={MLRIT_LEAF} fillRule="evenodd" d={MARK_ARROW} />
    </svg>
  );
}

/** "MLR INSTITUTE OF TECHNOLOGY" set in the logo's rounded bold face and orange. */
export function MlritWordmark({ className, full = false }) {
  if (!full) {
    return <span className={cn('font-wordmark font-black uppercase tracking-[0.02em] text-mlrit-orange', className)}>MLR Institute of Technology</span>;
  }
  return (
    <div className={cn('font-wordmark leading-none', className)}>
      <p className="font-black text-mlrit-orange text-[1em] tracking-[0.01em]">MLRIT</p>
      <p className="mt-[0.18em] font-extrabold text-[0.22em] text-current opacity-80 normal-case">Raising Engineers</p>
      <div className="my-[0.16em] h-px bg-current opacity-25" />
      <p className="font-black uppercase text-mlrit-orange text-[0.26em] tracking-[0.02em]">MLR Institute of Technology</p>
    </div>
  );
}

/**
 * Loading animation built from the mark alone: the gear settles in while the
 * green arrow sweeps up along its path, then fades and repeats.
 */
export function LogoLoader({ size = 64, label = 'Loading', className }) {
  return (
    <div role="status" aria-label={label} className={cn('mlrit-loader', className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
        <defs>
          <clipPath id="mlrit-loader-sweep">
            <rect className="mlrit-loader-sweep" x="0" y="0" width="100" height="100" />
          </clipPath>
        </defs>
        <path className="mlrit-loader-gear" fill={MLRIT_GREEN} fillRule="evenodd" d={MARK_GEAR} />
        <g clipPath="url(#mlrit-loader-sweep)">
          <path className="mlrit-loader-arrow" fill={MLRIT_LEAF} fillRule="evenodd" d={MARK_ARROW} />
        </g>
      </svg>
    </div>
  );
}

/** Full-screen variant, visually identical to the boot splash in index.html. */
export function FullScreenLoader({ label = 'Loading' }) {
  return (
    <div className="fixed inset-0 z-[2000] grid place-items-center bg-canvas">
      <LogoLoader size={84} label={label} />
    </div>
  );
}

/** Centered loader for lazy-loaded pages. */
export function RouteLoader() {
  return (
    // route-loader-in: invisible for the first 150 ms, so pages that load
    // quickly (prefetched chunks) never flash a spinner.
    <div className="grid place-items-center min-h-[55vh] route-loader-in">
      <LogoLoader size={56} label="Loading page" />
    </div>
  );
}
