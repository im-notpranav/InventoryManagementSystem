import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, CheckCircle } from 'lucide-react';
import useAuthStore from '../../store/auth.store';

export default function SettingsPage() {
  const user = useAuthStore(s => s.user);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    department: user?.department || '',
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-display font-bold text-slate-800">Settings</h2>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
        <div>
          <h3 className="font-semibold text-slate-800 mb-4">Profile Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input value={form.email} readOnly
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Role</label>
              <input value={user?.role || ''} readOnly
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Department</label>
              <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <button onClick={handleSave}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition">
            {saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
        </div>
        <div className="pt-4 border-t border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-2">System Information</h3>
          <p className="text-sm text-slate-500">InventBot v1.0.0 — Intelligent Inventory Management System</p>
          <p className="text-sm text-slate-400 mt-1">Powered by Gemini AI • React • Node.js • PostgreSQL</p>
        </div>
      </div>
    </motion.div>
  );
}
