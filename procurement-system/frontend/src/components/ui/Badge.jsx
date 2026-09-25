import { cn } from '../../lib/utils';
import { statusMeta, PRIORITY } from '../../lib/status';

export const TONES = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200/60',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200/60',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200/60',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200/60',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200/60',
  pink: 'bg-pink-50 text-pink-700 ring-pink-200/60',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200/60',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200/60',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
  teal: 'bg-teal-50 text-teal-700 ring-teal-200/60',
  red: 'bg-red-50 text-red-700 ring-red-200/60',
};

export const DOT = {
  slate: 'bg-slate-400',
  blue: 'bg-blue-500',
  brand: 'bg-brand-500',
  indigo: 'bg-indigo-500',
  violet: 'bg-violet-500',
  pink: 'bg-pink-500',
  amber: 'bg-amber-500',
  orange: 'bg-orange-500',
  emerald: 'bg-emerald-500',
  teal: 'bg-teal-500',
  red: 'bg-red-500',
};

export function Badge({ tone = 'slate', dot = false, pulse = false, size = 'sm', className = '', children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset whitespace-nowrap',
        size === 'xs' ? 'px-2 py-0.5 text-[10px]' : size === 'md' ? 'px-3 py-1 text-xs' : 'px-2.5 py-0.5 text-[11px]',
        TONES[tone] || TONES.slate,
        className,
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping', DOT[tone])} />}
          <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', DOT[tone])} />
        </span>
      )}
      {children}
    </span>
  );
}

export function StatusBadge({ status, dot = true, pulse, className, size }) {
  const meta = statusMeta(status);
  return (
    <Badge tone={meta.tone} dot={dot} pulse={pulse ?? status === 'pending'} className={className} size={size}>
      {meta.label}
    </Badge>
  );
}

export function PriorityBadge({ priority, className }) {
  const meta = PRIORITY[priority] || { tone: 'slate', label: priority || '—' };
  return (
    <Badge tone={meta.tone} className={className}>
      {meta.label}
    </Badge>
  );
}

export default Badge;
