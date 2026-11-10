import { cn, initials, hueFor } from '../../lib/utils';

const sizes = { xs: 'w-6 h-6 text-[10px]', sm: 'w-8 h-8 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-xl' };

/** Initials avatar with a stable hue derived from the name. */
export default function Avatar({ name, size = 'md', className = '', ring = false, solid = false }) {
  const h = hueFor(name);
  return (
    <div
      className={cn(
        'rounded-full grid place-items-center font-semibold shrink-0 select-none',
        sizes[size] || sizes.md,
        solid && 'bg-brand-500 text-white',
        ring && 'ring-2 ring-surface shadow-card',
        className,
      )}
      style={solid ? undefined : { background: `hsl(${h} 60% 50% / 0.14)`, color: `hsl(${h} 45% 45%)` }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
