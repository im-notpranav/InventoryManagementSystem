import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SendHorizontal, Trash2, Package, ClipboardList, Shield, ShoppingCart, Sparkles, Store, BarChart3, WifiOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/index';
import TextType from '../../components/reactbits/TextType/TextType';
import GradientText from '../../components/reactbits/GradientText/GradientText';
import SpotlightCard from '../../components/reactbits/SpotlightCard/SpotlightCard';
import { MessageBubble, TypingDots, BotAvatar } from '../../components/chat/ChatParts';
import { Badge, Button, useConfirm } from '../../components/ui';
import { useReducedMotion } from '../../hooks';
import { cn } from '../../lib/utils';

const STARTERS = [
  { icon: BarChart3, title: 'Daily summary', desc: 'What needs attention today?', prompt: 'What needs my attention today?', tone: 'bg-brand-50 text-brand-700' },
  { icon: Package, title: 'Stock levels', desc: 'Items in stock right now', prompt: 'What items are in stock?', tone: 'bg-emerald-50 text-emerald-700' },
  { icon: ClipboardList, title: 'Pending requests', desc: 'Purchase requests awaiting approval', prompt: 'Show me all pending purchase requests', tone: 'bg-amber-50 text-amber-700' },
  { icon: Shield, title: 'Expiring warranties', desc: 'Coverage ending this month', prompt: 'Which warranties are expiring this month?', tone: 'bg-violet-50 text-violet-700' },
  { icon: ShoppingCart, title: 'Raise a request', desc: 'e.g. order 5 laptops', prompt: 'Create a purchase request for 5 laptops', tone: 'bg-pink-50 text-pink-700' },
  { icon: Store, title: 'Vendors', desc: 'Approved suppliers', prompt: 'Show all vendors', tone: 'bg-teal-50 text-teal-700' },
];

const THINKING = ['Checking the database…', 'Analysing your request…', 'Scanning inventory…', 'Almost there…'];

export default function Chatbot() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const reduced = useReducedMotion();
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [ready, setReady] = useState(null);
  const [thinkIdx, setThinkIdx] = useState(0);
  const endRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    API.get('/chatbot/status').then((r) => setReady(!!r?.data?.data?.ready)).catch(() => setReady(false));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }, [messages, loading, reduced]);

  useEffect(() => {
    if (!loading) return undefined;
    setThinkIdx(0);
    const id = setInterval(() => setThinkIdx((i) => (i + 1) % THINKING.length), 1400);
    return () => clearInterval(id);
  }, [loading]);

  const resize = () => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  const send = async (forced) => {
    const text = String(forced ?? input).trim();
    if (!text || loading) return;
    setMessages((m) => [...m, { id: `${Date.now()}-u`, role: 'user', content: text, timestamp: new Date() }]);
    setInput('');
    setLoading(true);
    try {
      const res = await API.post('/chatbot/message', { message: text, conversation_history: history.slice(-10) });
      const { reply, suggestions = [], action_result } = res.data.data;
      setMessages((m) => [...m, { id: `${Date.now()}-b`, role: 'assistant', content: reply, timestamp: new Date(), action_result, suggestions: Array.isArray(suggestions) ? suggestions.slice(0, 4) : [] }]);
      setHistory((h) => [...h, { role: 'user', content: text }, { role: 'assistant', content: reply }].slice(-10));
    } catch (err) {
      let message = 'Connection failed. Check that the API is running.';
      if (err?.response?.status === 503) message = 'InventBot is temporarily unavailable.';
      else if (err?.response?.status === 429) message = 'Slow down a little — please wait a moment before sending more.';
      else if (err?.response?.data?.message) message = err.response.data.message;
      setMessages((m) => [...m, { id: `${Date.now()}-e`, role: 'assistant', content: message, timestamp: new Date(), isError: true, retryText: text }]);
    } finally {
      setLoading(false);
      setTimeout(resize, 0);
    }
  };

  const clear = async () => {
    if (!messages.length) return;
    const ok = await confirm({ title: 'Clear this conversation?', message: 'Messages are not stored on the server.', confirmText: 'Clear' });
    if (!ok) return;
    setMessages([]);
    setHistory([]);
  };

  const firstName = user?.name || 'there';

  return (
    <div className="flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 -my-6 lg:-my-8" style={{ height: 'calc(100vh - 68px)' }}>
      {/* header */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-slate-200/70 bg-white/70 backdrop-blur">
        <div className="flex items-center gap-3">
          <BotAvatar />
          <div>
            <p className="font-display font-semibold text-slate-900 leading-tight">InventBot AI</p>
            <div className="flex items-center gap-1.5 text-xs">
              {ready === null ? <span className="text-slate-400">Checking…</span> : ready ? <Badge tone="emerald" dot pulse size="xs">Online · gpt-4o-mini</Badge> : <Badge tone="red" dot size="xs">Not configured</Badge>}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" icon={Trash2} onClick={clear} disabled={!messages.length}>Clear chat</Button>
      </div>

      {ready === false && (
        <div className="shrink-0 flex items-center gap-2 px-4 sm:px-6 py-2 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs"><WifiOff className="w-3.5 h-3.5" /> The assistant needs an OpenAI key on the server. Ask your administrator to set <code className="font-mono">OPENAI_API_KEY</code>.</div>
      )}

      {/* transcript */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="mx-auto max-w-3xl">
          {messages.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-6 sm:pt-12 text-center">
              <div className="relative inline-flex">
                <BotAvatar className="!w-16 !h-16 !rounded-2xl [&>svg]:w-8 [&>svg]:h-8" />
                <motion.span className="absolute -inset-2 rounded-3xl border-2 border-brand-300/40" animate={reduced ? {} : { scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 2.2, repeat: Infinity }} />
              </div>
              <h2 className="font-display text-2xl sm:text-[28px] font-bold text-slate-900 mt-5">Hello, {firstName}</h2>
              <div className="mt-1.5 text-slate-500 text-[15px] min-h-[24px]">
                {reduced ? (
                  <span>Ask about stock, requests, warranties — or raise a purchase request.</span>
                ) : (
                  <TextType text={['Ask me about stock levels.', 'Check pending purchase requests.', 'Find warranties expiring soon.', 'Raise a purchase request in one line.']} typingSpeed={38} deletingSpeed={22} pauseDuration={1800} showCursor cursorCharacter="▍" cursorClassName="text-brand-500" className="text-slate-600" />
                )}
              </div>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-left">
                {STARTERS.map((s, i) => (
                  <motion.button key={s.title} type="button" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} onClick={() => send(s.prompt)} className="text-left group">
                    <SpotlightCard spotlightColor="rgba(46,117,182,0.14)" className="!rounded-2xl !p-4 !bg-white !border-slate-200/80 shadow-card transition-all group-hover:shadow-card-hover group-hover:-translate-y-0.5 h-full">
                      <span className={cn('w-9 h-9 rounded-xl grid place-items-center', s.tone)}><s.icon className="w-4 h-4" /></span>
                      <p className="mt-3 text-sm font-semibold text-slate-900">{s.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                    </SpotlightCard>
                  </motion.button>
                ))}
              </div>
              <p className="mt-6 text-xs text-slate-400 inline-flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-amber-400" /> InventBot answers from live data and can create purchase requests on your behalf.</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {messages.map((m) => <MessageBubble key={m.id} msg={m} userName={user?.name} onRetry={send} onSuggest={send} />)}
              </AnimatePresence>
              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5">
                  <BotAvatar className="mt-0.5" />
                  <div className="rounded-2xl rounded-tl-md bg-white border border-slate-200/80 shadow-card px-3.5 py-3"><TypingDots label={THINKING[thinkIdx]} /></div>
                </motion.div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>
      </div>

      {/* composer */}
      <div className="shrink-0 border-t border-slate-200/70 bg-white/80 backdrop-blur px-4 sm:px-6 py-3">
        <div className="mx-auto max-w-3xl">
          <div className={cn('flex items-end gap-2 rounded-2xl border bg-white px-3 py-2 shadow-card transition', loading ? 'border-slate-200' : 'border-slate-200 focus-within:border-brand-500 focus-within:shadow-glow')}>
            <Sparkles className="w-4 h-4 text-brand-400 mb-2.5 shrink-0" />
            <textarea
              ref={textRef}
              rows={1}
              value={input}
              disabled={loading || ready === false}
              onChange={(e) => { setInput(e.target.value.slice(0, 600)); resize(); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={ready === false ? 'Assistant unavailable' : 'Ask InventBot anything… (Enter to send, Shift+Enter for a new line)'}
              className="flex-1 resize-none bg-transparent text-sm leading-6 py-1.5 outline-none placeholder:text-slate-400 max-h-[140px]"
            />
            <motion.button whileTap={{ scale: 0.94 }} type="button" onClick={() => send()} disabled={loading || !input.trim()} className="w-9 h-9 rounded-xl grid place-items-center bg-brand-700 text-white disabled:bg-slate-200 disabled:text-slate-400 transition shrink-0" aria-label="Send">
              <SendHorizontal className="w-4 h-4" />
            </motion.button>
          </div>
          <div className="flex items-center justify-between mt-1.5 px-1 text-[11px] text-slate-400">
            <span>Responses may be imperfect — verify important numbers in the relevant page.</span>
            <span className={cn('tabular', input.length > 500 && 'text-amber-600')}>{input.length}/600</span>
          </div>
        </div>
      </div>
    </div>
  );
}
