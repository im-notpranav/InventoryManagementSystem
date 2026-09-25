import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

/**
 * Animated tab strip. tabs: [{ key, label, count?, icon? }]
 * variant: 'underline' | 'pill' | 'segmented'
 */
export default function Tabs({ tabs, value, onChange, variant = 'segmented', className = '', id = 'tabs' }) {
  if (variant === 'underline') {
    return (
      <div className={cn('flex gap-1 border-b border-slate-200 overflow-x-auto scrollbar-none', className)} role="tablist">
        {tabs.map((t) => {
          const active = t.key === value;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => onChange(t.key)}
              className={cn(
                'relative px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2',
                active ? 'text-brand-700' : 'text-slate-500 hover:text-slate-800',
              )}
            >
              {t.icon && <t.icon className="w-4 h-4" />}
              {t.label}
              {t.count !== undefined && (
                <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular', active ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500')}>{t.count}</span>
              )}
              {active && <motion.span layoutId={`${id}-underline`} className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-brand-600" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
            </button>
          );
        })}
      </div>
    );
  }

  const isPill = variant === 'pill';
  return (
    <div className={cn('inline-flex flex-wrap gap-1 rounded-xl p-1', isPill ? '' : 'bg-slate-100/80 border border-slate-200/60', className)} role="tablist">
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(t.key)}
            className={cn(
              'relative px-3.5 py-2 text-[13px] font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-2',
              active ? (isPill ? 'text-white' : 'text-slate-900') : 'text-slate-500 hover:text-slate-900',
            )}
          >
            {active && (
              <motion.span
                layoutId={`${id}-bg`}
                className={cn('absolute inset-0 rounded-lg', isPill ? 'bg-brand-700 shadow-card' : 'bg-white shadow-card')}
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {t.icon && <t.icon className="w-4 h-4" />}
              {t.label}
              {t.count !== undefined && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular',
                    active ? (isPill ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-700') : 'bg-slate-200/70 text-slate-600',
                  )}
                >
                  {t.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Horizontal filter chips with counts. */
export function FilterChips({ options, value, onChange, className = '' }) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)} className={cn('chip', active ? 'chip-active' : 'chip-idle')}>
            {o.dot && <span className={cn('w-1.5 h-1.5 rounded-full', active ? 'bg-white/80' : o.dot)} />}
            {o.label}
            {o.count !== undefined && <span className={cn('tabular', active ? 'text-white/80' : 'text-slate-400')}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
