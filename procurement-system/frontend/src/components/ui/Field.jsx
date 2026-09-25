import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff, Search, X, UploadCloud, FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

/** Label + control + hint/error wrapper. */
export function Field({ label, required, hint, error, htmlFor, className = '', children, inline = false }) {
  return (
    <div className={cn(inline ? 'flex items-center gap-3' : 'space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-[13px] font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-red-600 flex items-center gap-1">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ className = '', error, leftIcon: Left, mono, ...props }, ref) {
  return (
    <div className="relative">
      {Left && <Left className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />}
      <input
        ref={ref}
        className={cn('ui-input', Left && 'pl-9', error && 'ui-input-error', mono && 'font-mono', className)}
        {...props}
      />
    </div>
  );
});

export const Textarea = forwardRef(function Textarea({ className = '', error, rows = 3, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cn('ui-input resize-y min-h-[80px]', error && 'ui-input-error', className)} {...props} />;
});

export const Select = forwardRef(function Select({ className = '', error, children, placeholder, ...props }, ref) {
  return (
    <select ref={ref} className={cn('ui-input', error && 'ui-input-error', className)} {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {children}
    </select>
  );
});

export const PasswordInput = forwardRef(function PasswordInput({ className = '', ...props }, ref) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input ref={ref} type={show ? 'text' : 'password'} className={cn('ui-input pr-11', className)} {...props} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
        aria-label={show ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
});

export function SearchInput({ value, onChange, placeholder = 'Search…', className = '', autoFocus }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="ui-input pl-9 pr-9 bg-white"
        type="search"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full grid place-items-center text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Clear search"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export function Checkbox({ label, description, className = '', ...props }) {
  const id = useId();
  return (
    <label htmlFor={id} className={cn('flex items-start gap-3 cursor-pointer select-none group', className)}>
      <input id={id} type="checkbox" className="mt-0.5 w-4 h-4 rounded border-slate-300 text-brand-600 accent-brand-600 cursor-pointer" {...props} />
      <span>
        <span className="block text-sm text-slate-700 group-hover:text-slate-900">{label}</span>
        {description && <span className="block text-xs text-slate-500">{description}</span>}
      </span>
    </label>
  );
}

export function Switch({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-3 disabled:opacity-50"
    >
      <span
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200',
          checked ? 'bg-brand-600' : 'bg-slate-300',
        )}
      >
        <span
          className={cn(
            'inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </span>
      {label && <span className="text-sm text-slate-700">{label}</span>}
    </button>
  );
}

/** Segmented toggle (e.g. "Existing product | New product"). */
export function Segmented({ value, onChange, options, className = '', size = 'md' }) {
  return (
    <div className={cn('inline-flex rounded-xl bg-slate-100 p-1 gap-1', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'flex-1 rounded-lg font-medium transition-all duration-200 whitespace-nowrap',
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
              active ? 'bg-white text-slate-900 shadow-card' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Drag-and-drop file picker. */
export function FileDrop({ file, onChange, accept = '.pdf', label = 'Choose a file or drag it here', hint, error, compact }) {
  const id = useId();
  const [drag, setDrag] = useState(false);
  const pick = (f) => {
    if (!f) return;
    onChange(f);
  };
  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        pick(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        'relative flex items-center gap-3 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer',
        compact ? 'px-3 py-2.5' : 'px-4 py-4',
        drag ? 'border-brand-500 bg-brand-50/60' : file ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/60 hover:border-brand-300 hover:bg-white',
        error && 'border-red-300 bg-red-50/40',
      )}
    >
      <input id={id} type="file" accept={accept} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      <div className={cn('w-10 h-10 rounded-xl grid place-items-center shrink-0', file ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-brand-600 shadow-card')}>
        {file ? <CheckCircle2 className="w-5 h-5" /> : <UploadCloud className="w-5 h-5" />}
      </div>
      <div className="min-w-0 flex-1">
        {file ? (
          <>
            <p className="text-sm font-medium text-slate-800 truncate flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              {file.name}
            </p>
            <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB · click to replace</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-700">{label}</p>
            <p className="text-xs text-slate-500">{hint || `Accepted: ${accept.toUpperCase().replace(/\./g, '')}`}</p>
          </>
        )}
      </div>
      {file && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onChange(null);
          }}
          className="w-7 h-7 rounded-lg grid place-items-center text-slate-400 hover:text-red-600 hover:bg-red-50"
          aria-label="Remove file"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </label>
  );
}
