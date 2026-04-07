import { useState, useEffect } from 'react'
import { Bell, Search, Bot } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/auth.store'
import useChatbotStore from '../store/chatbot.store'
import { notificationsApi } from '../api/index.js'

export default function Topbar({ title }) {
  const user = useAuthStore((s) => s.user)
  const openChatbot = useChatbotStore((s) => s.open)
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    notificationsApi.getAll()
      .then(r => { if (r?.data?.unreadCount) setUnreadCount(r.data.unreadCount); })
      .catch(() => {});
    // Poll every 30 seconds
    const interval = setInterval(() => {
      notificationsApi.getAll()
        .then(r => { if (r?.data?.unreadCount !== undefined) setUnreadCount(r.data.unreadCount); })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [])

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="font-display text-xl font-bold text-slate-800">{title}</h1>
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search..."
            className="pl-9 pr-4 py-2 text-sm bg-slate-100 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
          />
        </div>
        {/* AI Assistant */}
        <button
          onClick={openChatbot}
          className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition"
          title="Open AI Assistant"
        >
          <Bot className="w-4 h-4" />
        </button>
        {/* Notifications */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        {/* Avatar */}
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
          {user?.name?.[0] || 'U'}
        </div>
      </div>
    </header>
  )
}
