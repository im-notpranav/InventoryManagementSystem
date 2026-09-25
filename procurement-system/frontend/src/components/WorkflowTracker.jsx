import { motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { WORKFLOW_STEPS } from '../lib/status';
import { cn } from '../lib/utils';

/**
 * Horizontal procurement workflow tracker.
 * currentStep: 0-based index into WORKFLOW_STEPS (the step currently in progress).
 * rejected: renders the tracker in a halted state.
 */
export default function WorkflowTracker({ currentStep = 0, rejected = false, steps = WORKFLOW_STEPS, compact = false }) {
  const pct = steps.length > 1 ? (Math.min(currentStep, steps.length - 1) / (steps.length - 1)) * 100 : 0;
  return (
    <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
      <div className={cn('relative', compact ? 'min-w-[560px]' : 'min-w-[760px]')}>
        {/* rail */}
        <div className="absolute left-[5%] right-[5%] top-[18px] h-0.5 bg-slate-200 rounded-full" />
        <motion.div
          className={cn('absolute left-[5%] top-[18px] h-0.5 rounded-full', rejected ? 'bg-red-400' : 'bg-gradient-to-r from-emerald-500 to-brand-500')}
          initial={{ width: 0 }}
          animate={{ width: `${pct * 0.9}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
        <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
          {steps.map((step, i) => {
            const done = i < currentStep;
            const active = i === currentStep && !rejected;
            const halted = rejected && i === currentStep;
            return (
              <li key={step.key} className="flex flex-col items-center text-center px-1">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 400, damping: 26 }}
                  className={cn(
                    'relative z-10 w-9 h-9 rounded-full grid place-items-center text-xs font-semibold border-2 transition-colors',
                    done && 'bg-emerald-500 border-emerald-500 text-white',
                    active && 'bg-brand-700 border-brand-700 text-white shadow-[0_0_0_6px_rgba(46,117,182,0.15)]',
                    halted && 'bg-red-500 border-red-500 text-white',
                    !done && !active && !halted && 'bg-white border-slate-300 text-slate-400',
                  )}
                >
                  {done ? <Check className="w-4 h-4" /> : halted ? <X className="w-4 h-4" /> : i + 1}
                  {active && <span className="absolute inset-0 rounded-full border-2 border-brand-400 animate-ping opacity-40" />}
                </motion.div>
                <p className={cn('mt-2 text-[12px] font-semibold leading-tight', active ? 'text-brand-700' : done ? 'text-slate-700' : halted ? 'text-red-600' : 'text-slate-400')}>{step.label}</p>
                {!compact && <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{step.sublabel}</p>}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
