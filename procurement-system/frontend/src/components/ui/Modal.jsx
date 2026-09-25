import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
};

/**
 * Accessible modal: portal, ESC/backdrop dismiss, scroll lock, focus into panel, spring animation.
 * Usage: <Modal open title="…" onClose={…} footer={<…/>}>body</Modal>
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  children,
  footer,
  size = 'md',
  dismissible = true,
  className = '',
  bodyClassName = '',
  tone = 'default', // 'default' | 'danger'
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && dismissible && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('modal-open');
    // Focus first focusable control
    const t = setTimeout(() => {
      const el = panelRef.current?.querySelector('input, select, textarea, button:not([data-close])');
      el?.focus?.();
    }, 60);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('modal-open');
      clearTimeout(t);
    };
  }, [open, onClose, dismissible]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[1000] flex items-start sm:items-center justify-center overflow-y-auto bg-slate-900/45 backdrop-blur-[3px] px-4 py-6 sm:py-10"
          onMouseDown={(e) => {
            if (dismissible && e.target === e.currentTarget) onClose?.();
          }}
          role="dialog"
          aria-modal="true"
          aria-label={typeof title === 'string' ? title : undefined}
        >
          <motion.div
            key="panel"
            ref={panelRef}
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className={cn('relative w-full bg-white rounded-2xl shadow-pop border border-slate-200/70 my-auto flex flex-col max-h-[calc(100vh-3rem)]', sizes[size], className)}
          >
            {(title || dismissible) && (
              <div className="flex items-start gap-3 px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                {Icon && (
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl grid place-items-center shrink-0',
                      tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-700',
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {title && <h3 className="font-display text-lg font-semibold text-slate-900 leading-tight">{title}</h3>}
                  {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
                </div>
                {dismissible && (
                  <button
                    type="button"
                    data-close
                    onClick={onClose}
                    className="w-8 h-8 -mr-2 -mt-1 rounded-lg grid place-items-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            <div className={cn('px-6 py-5 overflow-y-auto', bodyClassName)}>{children}</div>
            {footer && <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl flex items-center justify-end gap-2 shrink-0">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
