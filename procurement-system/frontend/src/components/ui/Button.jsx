import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const variants = {
  primary:
    'bg-brand-700 text-white shadow-[0_1px_2px_rgba(15,23,42,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-brand-600 hover:shadow-card-hover active:bg-brand-800',
  secondary: 'bg-white text-slate-700 border border-slate-200 shadow-card hover:bg-slate-50 hover:border-slate-300',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-card',
  'danger-soft': 'bg-red-50 text-red-700 hover:bg-red-100',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-card',
  'success-soft': 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  warning: 'bg-amber-500 text-white hover:bg-amber-600 shadow-card',
  violet: 'bg-violet-600 text-white hover:bg-violet-700 shadow-card',
  'violet-soft': 'bg-violet-50 text-violet-700 hover:bg-violet-100',
  link: 'bg-transparent text-brand-500 hover:text-brand-700 hover:underline px-0',
};

const sizes = {
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-lg',
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-base gap-2 rounded-xl',
  icon: 'h-9 w-9 p-0 rounded-xl',
  'icon-sm': 'h-8 w-8 p-0 rounded-lg',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, icon: Icon, children, className = '', type = 'button', ...props },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center font-medium whitespace-nowrap select-none',
        'transition-all duration-200 ease-out active:scale-[0.98]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none',
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : Icon ? <Icon className="w-4 h-4 shrink-0" /> : null}
      {children}
    </button>
  );
});

export default Button;
