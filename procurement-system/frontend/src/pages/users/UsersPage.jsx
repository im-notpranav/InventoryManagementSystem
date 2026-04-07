import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, X, Shield } from 'lucide-react';
import { usersApi } from '../../api/index.js';
import useAuthStore from '../../store/auth.store';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [editUser, setEditUser] = useState(null);
  const currentUser = useAuthStore(s => s.user);

  useEffect(() => { usersApi.getAll().then(r => r?.data && setUsers(r.data)).catch(() => {}); }, []);

  const handleUpdate = async () => {
    if (!editUser) return;
    try {
      await usersApi.update(editUser.id, { role: editUser.role, isActive: editUser.isActive });
      setEditUser(null);
      const res = await usersApi.getAll();
      if (res?.data) setUsers(res.data);
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this user?')) return;
    try {
      await usersApi.remove(id);
      const res = await usersApi.getAll();
      if (res?.data) setUsers(res.data);
    } catch (err) { console.error(err); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h2 className="text-xl font-display font-bold text-slate-800">Users & Roles</h2>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50/80">
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Name</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Email</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Department</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Role</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
            <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-3.5 font-medium text-slate-800">{u.name}</td>
                <td className="px-6 py-3.5 text-slate-600">{u.email}</td>
                <td className="px-6 py-3.5 text-slate-600">{u.department || '-'}</td>
                <td className="px-6 py-3.5"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{u.role}</span></td>
                <td className="px-6 py-3.5">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-center">
                  <button onClick={() => setEditUser({ ...u })} className="text-blue-600 hover:text-blue-700"><Edit2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <div className="px-6 py-12 text-center text-slate-400">No users found</div>}
      </div>

      <AnimatePresence>
        {editUser && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-slate-800">Edit User</h3>
                <button onClick={() => setEditUser(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm text-slate-500 mb-4">{editUser.name} ({editUser.email})</p>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Role</label>
                  <select value={editUser.role} onChange={e => setEditUser({ ...editUser, role: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {['Admin', 'Manager', 'User', 'Vendor'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-slate-700">Active</label>
                  <button onClick={() => setEditUser({ ...editUser, isActive: !editUser.isActive })}
                    className={`relative w-11 h-6 rounded-full transition ${editUser.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${editUser.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setEditUser(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button onClick={handleUpdate} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">Save</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
