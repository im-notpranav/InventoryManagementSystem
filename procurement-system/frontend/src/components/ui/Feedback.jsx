import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X, AlertOctagon } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { cn } from '../../lib/utils';

/**
 * Global toast + confirm provider.
 *   const toast = useToast();   toast.success('Saved'); toast.error('Nope');
 *   const confirm = useConfirm(); if (await confirm({ title, message, tone: 'danger' })) …
 */
const FeedbackContext = createContext(null);

const toastMeta = {
  success: { icon: CheckCircle2, ring: 'border-emerald-200', bar: 'bg-emerald-500', text: 'text-emerald-700' },
  error: { icon: XCircle, ring: 'border-red-200', bar: 'bg-red-500', text: 'text-red-700' },
  warning: { icon: AlertTriangle, ring: 'border-amber-200', bar: 'bg-amber-500', text: 'text-amber-700' },
  info: { icon: Info, ring: 'border-brand-200', bar: 'bg-brand-500', text: 'text-brand-700' },
};

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const resolver = useRef(null);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (type, message, opts = {}) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const toast = { id, type, message, title: opts.title, duration: opts.duration ?? 4000 };
      setToasts((t) => [...t.slice(-4), toast]);
      if (toast.duration > 0) setTimeout(() => dismiss(id), toast.duration);
      return id;
    },
    [dismiss],
  );

  const toast = useMemo(
    () => ({
      success: (m, o) => push('success', m, o),
      error: (m, o) => push('error', m, o),
      warning: (m, o) => push('warning', m, o),
      info: (m, o) => push('info', m, o),
      dismiss,
    }),
    [push, dismiss],
  );

  const confirm = useCallback((options) => {
    setConfirmState({ open: true, ...options });
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (value) => {
    resolver.current?.(value);
    resolver.current = null;
    setConfirmState((s) => (s ? { ...s, open: false } : s));
  };

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed bottom-5 right-5 z-[1100] flex flex-col gap-2 w-[min(92vw,380px)] pointer-events-none">
            <AnimatePresence initial={false}>
              {toasts.map((t) => {
                const meta = toastMeta[t.type] || toastMeta.info;
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, x: 40, scale: 0.96 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 40, scale: 0.96, transition: { duration: 0.15 } }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className={cn('pointer-events-auto relative overflow-hidden rounded-xl border bg-white shadow-pop pl-4 pr-3 py-3 flex items-start gap-3', meta.ring)}
                    role="status"
                  >
                    <span className={cn('absolute left-0 top-0 bottom-0 w-1', meta.bar)} />
                    <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', meta.text)} />
                    <div className="min-w-0 flex-1">
                      {t.title && <p className="text-sm font-semibold text-slate-900">{t.title}</p>}
                      <p className="text-sm text-slate-700 leading-snug break-words">{t.message}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => dismiss(t.id)}
                      className="w-6 h-6 rounded-md grid place-items-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      aria-label="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>,
          document.body,
        )}

      <Modal
        open={!!confirmState?.open}
        onClose={() => settle(false)}
        size="sm"
        title={confirmState?.title || 'Are you sure?'}
        description={confirmState?.message}
        icon={confirmState?.tone === 'danger' ? AlertOctagon : AlertTriangle}
        tone={confirmState?.tone === 'danger' ? 'danger' : 'default'}
        footer={
          <>
            <Button variant="secondary" onClick={() => settle(false)}>
              {confirmState?.cancelText || 'Cancel'}
            </Button>
            <Button variant={confirmState?.tone === 'danger' ? 'danger' : 'primary'} onClick={() => settle(true)} autoFocus>
              {confirmState?.confirmText || 'Confirm'}
            </Button>
          </>
        }
      >
        {confirmState?.body || (
          <p className="text-sm text-slate-600">{confirmState?.detail || 'This action will take effect immediately.'}</p>
        )}
      </Modal>
    </FeedbackContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useToast must be used within FeedbackProvider');
  return ctx.toast;
}

export function useConfirm() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useConfirm must be used within FeedbackProvider');
  return ctx.confirm;
}
