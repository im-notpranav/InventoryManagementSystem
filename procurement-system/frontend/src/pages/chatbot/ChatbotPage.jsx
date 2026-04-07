import { motion } from 'framer-motion';
import useChatbotStore from '../../store/chatbot.store';

export default function ChatbotPage() {
  const open = useChatbotStore(s => s.open);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🤖</span>
        </div>
        <h3 className="font-display font-bold text-slate-700 text-lg">AI Chatbot</h3>
        <p className="text-slate-400 text-sm mt-1 mb-4">Use the floating chatbot widget in the bottom-right corner!</p>
        <button onClick={open}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition">
          Open Chatbot
        </button>
      </div>
    </motion.div>
  );
}
