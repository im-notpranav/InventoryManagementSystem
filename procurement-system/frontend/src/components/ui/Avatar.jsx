import { cn, initials, hueFor } from '../../lib/utils';

const sizes = { xs: 'w-6 h-6 text-[10px]', sm: 'w-8 h-8 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-xl' };

/** Initials avatar with a stable hue derived from the name. */
export default function Avatar({ name, size = 'md', className = '', ring = false, solid = false }) {
  const h = hueFor(name);
  return (
    <div
      className={cn('rounded-xl grid place-items-center font-semibold shrink-0 select-none', sizes[size] || sizes.md, ring && 'ring-2 ring-white shadow-card', className)}
      style={
        solid
          ? { background: `linear-gradient(135deg, hsl(${h} 55% 45%), hsl(${(h + 30) % 360} 60% 38%))`, color: '#fff' }
          : { background: `hsl(${h} 70% 94%)`, color: `hsl(${h} 45% 32%)` }
      }
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
