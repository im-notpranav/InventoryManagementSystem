import { motion } from 'motion/react';
import { ArrowUpRight, Inbox, RefreshCw, AlertTriangle } from 'lucide-react';
import BlurText from '../reactbits/BlurText/BlurText';
import CountUp from '../reactbits/CountUp/CountUp';
import SpotlightCard from '../reactbits/SpotlightCard/SpotlightCard';
import Button from './Button';
import { cn } from '../../lib/utils';
import { useReducedMotion } from '../../hooks';

/** Page title block with animated heading, subtitle and action slot. */
export function PageHeader({ title, subtitle, eyebrow, icon: Icon, actions, className = '', animate = true }) {
  const reduced = useReducedMotion();
  return (
    <div className={cn('flex flex-col sm:flex-row sm:flex-wrap sm:items-end sm:justify-between gap-4', className)}>
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600 mb-1">{eyebrow}</p>}
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-card grid place-items-center text-brand-700 shrink-0">
              <Icon className="w-5 h-5" />
            </div>
          )}
          {animate && !reduced ? (
            <BlurText text={title} delay={40} animateBy="words" direction="top" stepDuration={0.28} className="min-w-0 font-display text-xl sm:text-2xl lg:text-[28px] font-bold text-slate-900 leading-tight" />
          ) : (
            <h1 className="min-w-0 font-display text-xl sm:text-2xl lg:text-[28px] font-bold text-slate-900 leading-tight">{title}</h1>
          )}
        </div>
        {subtitle && <p className="text-sm text-slate-500 mt-1.5 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0 [&>*]:max-sm:flex-1">{actions}</div>}
    </div>
  );
}

/** Card section with optional header/actions. */
export function Card({ title, description, icon: Icon, actions, children, className = '', bodyClassName = '', padded = true, hover = false }) {
  return (
    <section className={cn('surface', hover && 'surface-hover', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-5 py-4 border-b border-slate-100">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            {Icon && <Icon className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />}
            <div className="min-w-0">
              {title && <h2 className="font-display text-[15px] font-semibold text-slate-900 leading-snug text-balance">{title}</h2>}
              {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0 ml-auto">{actions}</div>}
        </header>
      )}
      <div className={cn(padded && 'p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

const toneMap = {
  brand: { icon: 'bg-brand-50 text-brand-700', spot: 'rgba(46,117,182,0.16)', accent: 'text-brand-700' },
  amber: { icon: 'bg-amber-50 text-amber-600', spot: 'rgba(245,158,11,0.16)', accent: 'text-amber-600' },
  red: { icon: 'bg-red-50 text-red-600', spot: 'rgba(239,68,68,0.14)', accent: 'text-red-600' },
  emerald: { icon: 'bg-emerald-50 text-emerald-600', spot: 'rgba(16,185,129,0.16)', accent: 'text-emerald-600' },
  violet: { icon: 'bg-violet-50 text-violet-600', spot: 'rgba(139,92,246,0.16)', accent: 'text-violet-600' },
  blue: { icon: 'bg-blue-50 text-blue-600', spot: 'rgba(59,130,246,0.16)', accent: 'text-blue-600' },
  slate: { icon: 'bg-slate-100 text-slate-600', spot: 'rgba(100,116,139,0.14)', accent: 'text-slate-700' },
  teal: { icon: 'bg-teal-50 text-teal-600', spot: 'rgba(20,184,166,0.16)', accent: 'text-teal-600' },
};

/** KPI tile: spotlight hover + animated count. `value` may be a number (animated) or string. */
export function StatCard({ label, value, icon: Icon, tone = 'brand', hint, delta, onClick, prefix = '', suffix = '', index = 0, loading, active, className = '' }) {
  const reduced = useReducedMotion();
  const t = toneMap[tone] || toneMap.brand;
  const numeric = typeof value === 'number' && Number.isFinite(value);
  const Wrapper = onClick ? motion.button : motion.div;
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn('text-left w-full h-full group', onClick && 'cursor-pointer', className)}
    >
      <SpotlightCard
        spotlightColor={t.spot}
        className={cn(
          '!rounded-2xl !p-5 !bg-white !border-slate-200/80 shadow-card transition-all duration-300 h-full flex flex-col',
          onClick && 'group-hover:shadow-card-hover group-hover:-translate-y-0.5 group-hover:border-slate-300',
          active && '!border-brand-400 ring-2 ring-brand-100',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className={cn('w-10 h-10 rounded-xl grid place-items-center shrink-0', t.icon)}>{Icon && <Icon className="w-5 h-5" />}</div>
          {onClick && <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-brand-600 transition-colors shrink-0" />}
        </div>
        {/* Fixed offset from the icon row so the value + label line up across every tile in
            the row; an optional hint just hangs below in the space the tallest card creates. */}
        <div className="mt-4 min-w-0">
          {loading ? (
            <div className="skeleton h-8 w-20" />
          ) : (
            <p className="font-display text-xl sm:text-[26px] font-bold text-slate-900 leading-none tabular break-words min-w-0">
              {prefix}
              {numeric && !reduced ? <CountUp to={value} from={0} duration={0.9} separator="," /> : numeric ? value.toLocaleString('en-IN') : value ?? '—'}
              {suffix}
            </p>
          )}
          <div className="mt-2 flex items-start justify-between gap-2 min-w-0">
            <p className="text-[13px] text-slate-500 font-medium leading-snug min-w-0">{label}</p>
            {delta !== undefined && delta !== null && (
              <span className={cn('text-[11px] font-semibold shrink-0 mt-px', typeof delta === 'number' && delta < 0 ? 'text-red-600' : t.accent)}>
                {typeof delta === 'number' ? `${delta > 0 ? '+' : ''}${delta}` : delta}
              </span>
            )}
          </div>
          {hint && <p className="text-[11px] text-slate-400 mt-1 leading-snug">{hint}</p>}
        </div>
      </SpotlightCard>
    </Wrapper>
  );
}

export function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', description, action, className = '', compact }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'py-8' : 'py-16', className)}>
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 grid place-items-center text-slate-400 mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <p className="font-display text-[15px] font-semibold text-slate-800">{title}</p>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong', onRetry, className = '' }) {
  return (
    <div className={cn('surface border-red-200 bg-red-50/40 p-6 flex flex-col sm:flex-row sm:items-center gap-4', className)}>
      <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 grid place-items-center shrink-0">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-red-800">We couldn't load this page</p>
        <p className="text-sm text-red-700/80">{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" icon={RefreshCw} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Page-level skeleton while first data loads. */
export function PageSkeleton({ stats = 4, table = true }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <div className="skeleton h-7 w-56" />
        <div className="skeleton h-4 w-80" />
      </div>
      {stats > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: stats }).map((_, i) => (
            <div key={i} className="surface p-5 space-y-4">
              <div className="skeleton h-10 w-10 rounded-xl" />
              <div className="skeleton h-7 w-20" />
              <div className="skeleton h-3 w-28" />
            </div>
          ))}
        </div>
      )}
      {table && (
        <div className="surface p-5 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-5" style={{ width: `${60 + ((i * 13) % 40)}%` }} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Staggered vertical list wrapper. */
export function Stagger({ children, className = '', delay = 0.05 }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : 'hidden'}
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: delay } } }}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

export function StaggerItem({ children, className = '', ...props }) {
  return (
    <motion.div variants={staggerItem} className={className} {...props}>
      {children}
    </motion.div>
  );
}

/** Small key/value block used in expanded rows and detail cards. */
export function KV({ label, value, mono, className = '' }) {
  return (
    <div className={className}>
      <p className="text-[10px] uppercase tracking-[0.1em] text-slate-400 font-semibold mb-1">{label}</p>
      <p className={cn('text-sm font-medium text-slate-800 break-words', mono && 'font-mono')}>{value ?? '—'}</p>
    </div>
  );
}

/** Thin progress bar with tone. */
export function Progress({ value = 0, tone = 'brand', className = '', size = 'md' }) {
  const color = { brand: 'bg-brand-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500', violet: 'bg-violet-500', slate: 'bg-slate-400' }[tone] || 'bg-brand-500';
  return (
    <div className={cn('w-full rounded-full bg-slate-100 overflow-hidden', size === 'sm' ? 'h-1.5' : 'h-2', className)}>
      <motion.div
        className={cn('h-full rounded-full', color)}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
