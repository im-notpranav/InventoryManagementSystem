import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileSearch, Filter } from 'lucide-react';
import { usersApi } from '../../api/index.js';

const actionColors = {
  CREATE: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-purple-100 text-purple-700',
  APPROVE: 'bg-green-100 text-green-700',
  REJECT: 'bg-orange-100 text-orange-700',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({ entity: '', action: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async (query = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.entity) params.append('entity', query.entity);
      if (query.action) params.append('action', query.action);
      const res = await usersApi.getAuditLogs(params.toString());
      if (res?.data) setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    fetchLogs(filters);
  };

  const entities = ['User', 'Vendor', 'Product', 'PurchaseRequest', 'PurchaseOrder', 'GoodsReceipt', 'Invoice', 'Warranty', 'Inventory'];
  const actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'APPROVE', 'REJECT'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-800 flex items-center gap-2">
            <FileSearch className="w-6 h-6 text-blue-600" />
            Audit Logs
          </h2>
          <p className="text-slate-500 text-sm mt-1">Track all system actions for compliance</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-end gap-4 flex-wrap">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Entity</label>
          <select
            value={filters.entity}
            onChange={(e) => setFilters({ ...filters, entity: e.target.value })}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Entities</option>
            {entities.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Action</label>
          <select
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleFilter}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
        >
          <Filter className="w-4 h-4" /> Apply
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-slate-400">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Timestamp</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">User</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Action</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Entity</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3.5 text-slate-500 text-xs">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-3.5 text-slate-700">
                    {log.user?.name || 'System'}
                    {log.user?.email && <span className="text-xs text-slate-400 block">{log.user.email}</span>}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${actionColors[log.action] || 'bg-slate-100 text-slate-600'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-600">
                    {log.entity}
                    {log.entityId && <span className="text-xs text-slate-400 ml-1">#{log.entityId}</span>}
                  </td>
                  <td className="px-6 py-3.5 text-slate-500 text-xs max-w-xs truncate" title={log.details}>
                    {log.details || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && logs.length === 0 && (
          <div className="px-6 py-12 text-center text-slate-400">No audit logs found</div>
        )}
      </div>
    </motion.div>
  );
}
