import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, X, Send, Trash2, Maximize2, Package, AlertTriangle, ClipboardList, Shield, Store, BarChart3 } from 'lucide-react';
import useChatbotStore from '../store/chatbot.store';
import { chatbotApi } from '../api/index.js';
import { useAuth } from '../context/AuthContext';
import { MessageBubble, TypingDots, BotAvatar } from './chat/ChatParts';
import { useReducedMotion } from '../hooks';
import { cn } from '../lib/utils';

const STARTERS = [
  { icon: BarChart3, title: 'Daily summary', msg: 'What needs my attention today?', tone: 'bg-brand-50 text-brand-700' },
  { icon: Package, title: 'Check stock', msg: 'Show all stock levels', tone: 'bg-emerald-50 text-emerald-700' },
  { icon: AlertTriangle, title: 'Low stock', msg: 'What items are running low?', tone: 'bg-amber-50 text-amber-700' },
  { icon: ClipboardList, title: 'My requests', msg: 'Show my purchase requests', tone: 'bg-blue-50 text-blue-700' },
  { icon: Shield, title: 'Warranties', msg: 'Show expiring warranties', tone: 'bg-violet-50 text-violet-700' },
  { icon: Store, title: 'Vendors', msg: 'Show all vendors', tone: 'bg-teal-50 text-teal-700' },
];

const THINKING = ['Checking database…', 'Analysing your request…', 'Looking that up…', 'Scanning inventory…', 'Almost ready…'];
const MAX = 500;

export default function ChatbotWidget() {
  const { isOpen, messages, isLoading, toggle, addMessage, setLoading, clearMessages } = useChatbotStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [input, setInput] = useState('');
  const [thinkIdx, setThinkIdx] = useState(0);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }, [messages, isLoading, reduced]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 250);
  }, [isOpen]);

  useEffect(() => {
    if (!isLoading) return undefined;
    setThinkIdx(0);
    const id = setInterval(() => setThinkIdx((p) => (p + 1) % THINKING.length), 1500);
    return () => clearInterval(id);
  }, [isLoading]);

  // ESC closes
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && toggle();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, toggle]);

  const send = async (text = input) => {
    const t = String(text || '').trim();
    if (!t || isLoading) return;
    addMessage({ role: 'user', content: t });
    setInput('');
    setLoading(true);
    try {
      const history = messages.filter((m) => !m.isError).map((m) => ({ role: m.role, content: m.content }));
      const res = await chatbotApi.query({ message: t, conversation_history: history.slice(-10) });
      const data = res?.data?.data || res?.data;
      if (data?.reply) addMessage({ role: 'assistant', content: data.reply, suggestions: Array.isArray(data.suggestions) ? data.suggestions.slice(0, 4) : [], action_result: data.action_result || null });
      else addMessage({ role: 'assistant', content: 'I could not generate a response right now.', isError: true, retryText: t });
    } catch (err) {
      const status = err?.response?.status;
      addMessage({ role: 'assistant', content: status === 429 ? 'Please wait a moment before sending more.' : status === 503 ? 'The assistant is temporarily unavailable.' : "Sorry, I couldn't reach the server. Is the API running?", isError: true, retryText: t });
    } finally {
      setLoading(false);
    }
  };

  const showStarters = messages.length <= 1 && !isLoading;

  return (
    <>
      {/* Floating trigger */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            id="chatbot-toggle"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={toggle}
            className="fixed bottom-4 right-4 lg:bottom-6 lg:right-6 z-[60] h-12 pl-4 pr-5 rounded-full bg-brand-500 hover:bg-brand-600 text-white flex items-center gap-2 shadow-pop transition-colors"
            aria-label="Open assistant"
          >
            <Bot className="w-5 h-5" />
            <span className="text-sm font-semibold hidden sm:inline">Assistant</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="chatbot-window"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="fixed z-[70] inset-x-3 bottom-3 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-[400px] h-[min(620px,calc(100vh-2rem))] bg-surface rounded-2xl shadow-pop border border-slate-200 flex flex-col overflow-hidden"
            role="dialog"
            aria-label="Assistant"
          >
            {/* header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-brand-50 text-brand-600 grid place-items-center"><Bot className="w-5 h-5" /></span>
                <div>
                  <p className="font-semibold text-sm text-slate-900 leading-tight">Assistant</p>
                  <p className="text-[11px] text-slate-500">Answers from live inventory data</p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => { toggle(); navigate('/chatbot'); }} className="w-8 h-8 rounded-lg hover:bg-slate-100 grid place-items-center text-slate-500 hover:text-slate-900" title="Open full page"><Maximize2 className="w-4 h-4" /></button>
                <button type="button" onClick={clearMessages} className="w-8 h-8 rounded-lg hover:bg-slate-100 grid place-items-center text-slate-500 hover:text-slate-900" title="Clear chat"><Trash2 className="w-4 h-4" /></button>
                <button type="button" onClick={toggle} className="w-8 h-8 rounded-lg hover:bg-slate-100 grid place-items-center text-slate-500 hover:text-slate-900" title="Close"><X className="w-4 h-4" /></button>
              </div>
            </div>

            {/* messages */}
            <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3.5 bg-slate-50/70">
              {messages.map((m) => <MessageBubble key={m.id} msg={m} userName={user?.name} onRetry={send} onSuggest={send} compact showCopy={false} />)}

              {showStarters && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="pt-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 px-1 mb-2">Try one of these</p>
                  <div className="grid grid-cols-2 gap-2">
                    {STARTERS.map((c, i) => (
                      <motion.button key={c.title} type="button" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} onClick={() => send(c.msg)} className="text-left rounded-xl border border-slate-200 bg-surface p-3 hover:border-brand-300 hover:shadow-card transition group">
                        <span className={cn('w-7 h-7 rounded-lg grid place-items-center', c.tone)}><c.icon className="w-3.5 h-3.5" /></span>
                        <p className="text-xs font-semibold text-slate-800 mt-2 group-hover:text-brand-800">{c.title}</p>
                        <p className="text-[10.5px] text-slate-500 leading-snug mt-0.5 line-clamp-2">{c.msg}</p>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5">
                  <BotAvatar size="sm" className="mt-0.5" />
                  <div className="rounded-2xl rounded-tl-md bg-surface border border-slate-200/80 shadow-card px-3.5 py-2.5"><TypingDots label={THINKING[thinkIdx]} /></div>
                </motion.div>
              )}
              <div ref={endRef} />
            </div>

            {/* composer */}
            <div className="shrink-0 border-t border-slate-200 bg-surface px-3 py-2.5">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 focus-within:border-brand-500 focus-within:bg-surface focus-within:shadow-glow transition">
                <input
                  id="chatbot-input"
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, MAX))}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Ask about stock, orders, warranties…"
                  className="flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400"
                />
                <motion.button whileTap={{ scale: 0.92 }} type="button" onClick={() => send()} disabled={!input.trim() || isLoading} className="w-8 h-8 rounded-lg grid place-items-center bg-brand-500 text-white disabled:bg-slate-200 disabled:text-slate-400 transition shrink-0" aria-label="Send">
                  <Send className="w-3.5 h-3.5" />
                </motion.button>
              </div>
              <div className="flex justify-between mt-1 px-1 text-[10px] text-slate-400">
                <span>Enter to send · Esc to close</span>
                {input.length > 300 && <span className={input.length > 450 ? 'text-red-500' : ''}>{MAX - input.length} left</span>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
