import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { notificationsApi } from '../../api/index.js';

const typeIcon = { info: '💬', warning: '⚠️', success: '✅', error: '❌' };

export default function NotificationsPage() {
  const [data, setData] = useState({ notifications: [], unreadCount: 0 });
  useEffect(() => { notificationsApi.getAll().then(r => r?.data && setData(r.data)).catch(() => {}); }, []);

  const handleMarkRead = async (id) => {
    await notificationsApi.markRead(id);
    const res = await notificationsApi.getAll();
    if (res?.data) setData(res.data);
  };

  const handleMarkAll = async () => {
    await notificationsApi.markAllRead();
    const res = await notificationsApi.getAll();
    if (res?.data) setData(res.data);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-800">Notifications</h2>
          <p className="text-slate-500 text-sm mt-1">{data.unreadCount} unread</p>
        </div>
        <button onClick={handleMarkAll} className="text-sm text-blue-600 font-medium hover:text-blue-700">Mark all read</button>
      </div>
      <div className="space-y-2">
        {data.notifications.map(n => (
          <motion.div key={n.id} whileHover={{ x: 2 }}
            className={`bg-white rounded-xl border p-4 flex items-start gap-3 cursor-pointer transition ${n.isRead ? 'border-slate-100' : 'border-blue-200 bg-blue-50/30'}`}
            onClick={() => !n.isRead && handleMarkRead(n.id)}>
            <span className="text-lg">{typeIcon[n.type] || '📌'}</span>
            <div className="flex-1">
              <h4 className={`text-sm font-semibold ${n.isRead ? 'text-slate-600' : 'text-slate-800'}`}>{n.title}</h4>
              <p className="text-sm text-slate-500 mt-0.5">{n.message}</p>
              <p className="text-xs text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
            {!n.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />}
          </motion.div>
        ))}
        {data.notifications.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-12 text-center text-slate-400">No notifications yet 🔔</div>
        )}
      </div>
    </motion.div>
  );
}
