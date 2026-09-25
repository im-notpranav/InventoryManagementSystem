import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Bot, Copy, Check, CheckCircle2, ArrowRight, AlertTriangle, RotateCcw } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { cn, fmtTime } from '../../lib/utils';

/* ───────── Safe, tiny markdown → React (bold, italic, code, bullets, numbered) ───────── */
function inline(text, keyBase) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((chunk, i) => {
    const key = `${keyBase}-${i}`;
    if (chunk.startsWith('**') && chunk.endsWith('**')) return <strong key={key} className="font-semibold">{chunk.slice(2, -2)}</strong>;
    if (chunk.startsWith('`') && chunk.endsWith('`')) return <code key={key} className="font-mono text-[12px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded">{chunk.slice(1, -1)}</code>;
    if (chunk.startsWith('*') && chunk.endsWith('*') && chunk.length > 2) return <em key={key}>{chunk.slice(1, -1)}</em>;
    return <span key={key}>{chunk}</span>;
  });
}

export function Markdown({ text, className = '' }) {
  const lines = String(text || '').split('\n');
  const out = [];
  let list = null; // { type: 'ul'|'ol', items: [] }
  const flush = () => {
    if (!list) return;
    const Tag = list.type;
    out.push(
      <Tag key={`l-${out.length}`} className={cn('my-1.5 pl-5 space-y-1', list.type === 'ul' ? 'list-disc' : 'list-decimal')}>
        {list.items.map((it, i) => <li key={i}>{inline(it, `li-${out.length}-${i}`)}</li>)}
      </Tag>,
    );
    list = null;
  };
  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const ul = line.match(/^\s*[-•]\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ul) {
      if (!list || list.type !== 'ul') { flush(); list = { type: 'ul', items: [] }; }
      list.items.push(ul[1]);
      return;
    }
    if (ol) {
      if (!list || list.type !== 'ol') { flush(); list = { type: 'ol', items: [] }; }
      list.items.push(ol[1]);
      return;
    }
    flush();
    if (line.startsWith('### ')) return out.push(<p key={i} className="font-semibold text-slate-900 mt-2">{inline(line.slice(4), `h-${i}`)}</p>);
    if (!line.trim()) return out.push(<div key={i} className="h-1.5" />);
    out.push(<p key={i}>{inline(line, `p-${i}`)}</p>);
  });
  flush();
  return <div className={cn('space-y-1 leading-relaxed', className)}>{out}</div>;
}

/* ───────── Bubbles ───────── */
export function BotAvatar({ size = 'md', className = '' }) {
  const s = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';
  return (
    <span className={cn(s, 'rounded-xl grid place-items-center shrink-0 text-white bg-gradient-to-br from-brand-700 to-brand-500 shadow-[0_6px_16px_-6px_rgba(46,117,182,0.6)]', className)}>
      <Bot className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
    </span>
  );
}

export function TypingDots({ label }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-brand-400" animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
        ))}
      </div>
      {label && <span className="text-[11px] text-slate-400">{label}</span>}
    </div>
  );
}

export function PRCreatedCard({ result, compact = false }) {
  const navigate = useNavigate();
  return (
    <motion.div initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="mt-2 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-3.5 max-w-sm">
      <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
        <CheckCircle2 className="w-4 h-4" /> Purchase request created
      </div>
      <p className="font-mono text-brand-700 font-bold mt-1.5 text-base">{result.pr_number}</p>
      <p className="text-xs text-slate-600 mt-0.5">{result.product_name} × {result.quantity}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200/60 px-2 py-0.5 text-[10px] font-medium">Pending admin approval</span>
        {!compact && (
          <button type="button" onClick={() => navigate('/purchase-requests')} className="text-xs font-semibold text-brand-700 hover:text-brand-900 inline-flex items-center gap-1">
            View <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function SuggestionChips({ items = [], onPick, className = '', size = 'md' }) {
  if (!items.length) return null;
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {items.map((s, i) => (
        <motion.button
          key={`${s}-${i}`}
          type="button"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * i }}
          onClick={() => onPick(s)}
          className={cn('rounded-full border border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 transition font-medium', size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs')}
        >
          {s}
        </motion.button>
      ))}
    </div>
  );
}

/**
 * One chat message. `msg`: { role, content, timestamp, isError, retryText, action_result, suggestions }
 */
export function MessageBubble({ msg, userName, onRetry, onSuggest, compact = false, showCopy = true }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === 'user';
  const copy = () => {
    navigator.clipboard?.writeText(String(msg.content || ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className={cn('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {isUser ? <Avatar name={userName} size={compact ? 'xs' : 'sm'} solid className="mt-0.5" /> : <BotAvatar size={compact ? 'sm' : 'md'} className="mt-0.5" />}
      <div className={cn('min-w-0', compact ? 'max-w-[85%]' : 'max-w-[78%]')}>
        <div
          className={cn(
            'group relative px-3.5 py-2.5 text-[13.5px] shadow-card',
            isUser ? 'bg-brand-700 text-white rounded-2xl rounded-tr-md' : msg.isError ? 'bg-red-50 text-red-800 border border-red-200 rounded-2xl rounded-tl-md' : 'bg-white text-slate-800 border border-slate-200/80 rounded-2xl rounded-tl-md',
          )}
        >
          {msg.isError ? (
            <div className="flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>{msg.content}</span></div>
          ) : isUser ? (
            <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
          ) : (
            <Markdown text={msg.content} />
          )}
          {!isUser && !msg.isError && showCopy && (
            <button type="button" onClick={copy} className="absolute -top-2 -right-2 w-6 h-6 rounded-lg bg-white border border-slate-200 shadow-card grid place-items-center text-slate-400 opacity-0 group-hover:opacity-100 transition hover:text-slate-700" aria-label="Copy">
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            </button>
          )}
        </div>
        {msg.isError && onRetry && (
          <button type="button" onClick={() => onRetry(msg.retryText)} className="mt-1 text-xs font-medium text-brand-700 inline-flex items-center gap-1 hover:underline"><RotateCcw className="w-3 h-3" /> Try again</button>
        )}
        {msg.action_result?.type === 'PURCHASE_REQUEST_CREATED' && <PRCreatedCard result={msg.action_result} compact={compact} />}
        {!isUser && onSuggest && <SuggestionChips items={msg.suggestions} onPick={onSuggest} className="mt-2" size={compact ? 'sm' : 'md'} />}
        <p className={cn('mt-1 text-[10px] text-slate-400', isUser && 'text-right')}>{fmtTime(msg.timestamp)}</p>
      </div>
    </motion.div>
  );
}
