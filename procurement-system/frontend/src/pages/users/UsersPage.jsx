import { useEffect, useMemo, useState } from 'react';
import { Users as UsersIcon, Pencil, KeyRound, Mail, Plus, UserCheck, UserX, Shield, Filter, Store, UserMinus, GraduationCap } from 'lucide-react';
import { usersApi, rolesApi } from '../../api/index.js';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { DeptBadge } from '../../components/order/OrderParts';
import { PageHeader, StatCard, DataTable, Button, Modal, Field, Input, Select, PasswordInput, SearchInput, FilterChips, StatusBadge, Badge, Avatar, Switch, KV, useToast, useConfirm, ErrorState } from '../../components/ui';
import { fmtDate, fmtDateTime, dataOf, errMsg } from '../../lib/utils';
import { DEPARTMENTS, DEFAULT_DEPARTMENT, DEPARTMENT_ROLES, ALL_DEPARTMENTS, isSuperAdmin } from '../../lib/departments';

const ROLE_TONE = { Admin: 'brand', 'Department User': 'blue', Vendor: 'violet', Watchman: 'teal', Accountant: 'pink', Manager: 'indigo' };
const ROLE_LABEL = { Admin: 'HOD', 'Department User': 'Faculty' };
const roleLabel = (r) => ROLE_LABEL[r] || r;
const FACULTY = 'Department User';
const COLLEGE_WIDE = '__college__'; // filter value for users without a department

export default function UsersPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user: me } = useAuth();
  const superAdmin = isSuperAdmin(me);
  const emptyCreate = () => ({ name: '', email: '', password: '', role_name: superAdmin ? '' : FACULTY, department: DEFAULT_DEPARTMENT, phone: '' });

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [emailUser, setEmailUser] = useState(null);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [editForm, setEditForm] = useState({});
  const [resetForm, setResetForm] = useState({ new_password: '', confirm: '' });
  const [emailForm, setEmailForm] = useState({ email: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, r] = await Promise.all([usersApi.getAll(), rolesApi.getAll()]);
      setUsers(dataOf(u));
      setRoles(dataOf(r));
    } catch (e) {
      setError(errMsg(e, 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // HODs may only add / manage faculty of their own department.
  const creatableRoles = superAdmin ? roles : roles.filter((r) => r.role_name === FACULTY);
  const canManage = (u) => superAdmin || u.role_name === FACULTY;

  const roleCounts = useMemo(() => {
    const c = {};
    users.forEach((u) => { c[u.role_name] = (c[u.role_name] || 0) + 1; });
    return c;
  }, [users]);

  const deptCounts = useMemo(() => {
    const c = {};
    users.forEach((u) => { const k = u.department || COLLEGE_WIDE; c[k] = (c[k] || 0) + 1; });
    return c;
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role_name !== roleFilter) return false;
      if (deptFilter !== 'all' && (u.department || COLLEGE_WIDE) !== deptFilter) return false;
      if (statusFilter === 'active' && !u.is_active) return false;
      if (statusFilter === 'inactive' && u.is_active) return false;
      if (!q) return true;
      return [u.name, u.email, u.role_name, roleLabel(u.role_name), u.department, u.phone].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [users, search, roleFilter, deptFilter, statusFilter]);

  const run = async (fn, successMsg) => {
    setSaving(true);
    try {
      await fn();
      toast.success(successMsg);
      load();
      return true;
    } catch (e) {
      toast.error(errMsg(e));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    if (!createForm.role_name) return toast.error('Choose a role');
    const ok = await run(() => usersApi.create(createForm), `${createForm.name} created${createForm.role_name === 'Vendor' ? ' with vendor portal access' : ''}`);
    if (ok) {
      setShowCreate(false);
      setCreateForm(emptyCreate());
    }
  };
  const submitEdit = async (e) => {
    e.preventDefault();
    const ok = await run(() => usersApi.update(editUser.user_id, editForm), 'User updated');
    if (ok) setEditUser(null);
  };
  const submitReset = async (e) => {
    e.preventDefault();
    if (resetForm.new_password !== resetForm.confirm) return toast.error('Passwords do not match');
    if (resetForm.new_password.length < 8) return toast.error('Password must be at least 8 characters');
    const ok = await run(() => usersApi.resetPassword(resetUser.user_id, resetForm.new_password), `Password reset for ${resetUser.name}`);
    if (ok) {
      setResetUser(null);
      setResetForm({ new_password: '', confirm: '' });
    }
  };
  const submitEmail = async (e) => {
    e.preventDefault();
    const ok = await run(() => api.put(`/users/${emailUser.user_id}/change-email`, { new_email: emailForm.email }), 'Email updated');
    if (ok) {
      setEmailUser(null);
      setEmailForm({ email: '' });
    }
  };
  const deactivate = async (u) => {
    const ok = await confirm({ title: `Deactivate ${u.name}?`, message: 'They will no longer be able to sign in. You can reactivate them later from Edit.', tone: 'danger', confirmText: 'Deactivate' });
    if (!ok) return;
    await run(() => usersApi.remove(u.user_id), `${u.name} deactivated`);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({
      name: u.name,
      email: u.email,
      role_name: u.role_name,
      department: u.department || (u.role_name === 'Admin' ? ALL_DEPARTMENTS : DEFAULT_DEPARTMENT),
      phone: u.phone || '',
      is_active: u.is_active,
    });
  };

  const deptCell = (u) => (u.department
    ? <DeptBadge department={u.department} />
    : <span className="text-xs text-slate-400">{u.role_name === 'Admin' ? 'All departments' : 'College-wide'}</span>);

  const columns = [
    { key: 'name', header: 'User', sortValue: (u) => u.name, render: (u) => (
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={u.name} size="md" solid className={!u.is_active ? 'grayscale opacity-70' : ''} />
        <div className="min-w-0">
          <p className="font-medium text-slate-800 truncate">{u.name}</p>
          <p className="text-xs text-slate-500 truncate">{u.email}</p>
        </div>
      </div>
    ) },
    { key: 'department', header: 'Department', sortValue: (u) => u.department || '~', render: deptCell },
    { key: 'role_name', header: 'Role', hideBelow: 'md', sortValue: (u) => roleLabel(u.role_name), render: (u) => <Badge tone={ROLE_TONE[u.role_name] || 'slate'}>{roleLabel(u.role_name)}</Badge> },
    { key: 'phone', header: 'Phone', hideBelow: 'lg', render: (u) => <span className="text-slate-500 text-xs font-mono">{u.phone || '—'}</span> },
    { key: 'is_active', header: 'Status', render: (u) => <StatusBadge status={u.is_active ? 'active' : 'inactive'} pulse={false} /> },
    { key: 'created_at', header: 'Joined', hideBelow: 'lg', sortValue: (u) => (u.created_at ? new Date(u.created_at).getTime() : 0), render: (u) => <span className="text-xs text-slate-500">{fmtDate(u.created_at)}</span> },
    { key: 'actions', header: '', sortable: false, align: 'right', hideBelow: 'md', render: (u) => (canManage(u) ? (
      <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
        <Button size="icon-sm" variant="ghost" title="Edit" onClick={() => openEdit(u)}><Pencil className="w-4 h-4" /></Button>
        <Button size="icon-sm" variant="ghost" title="Reset password" onClick={() => setResetUser(u)}><KeyRound className="w-4 h-4" /></Button>
        <Button size="icon-sm" variant="ghost" title="Change email" onClick={() => { setEmailUser(u); setEmailForm({ email: u.email }); }}><Mail className="w-4 h-4" /></Button>
        {u.is_active && u.user_id !== me?.user_id && <Button size="icon-sm" variant="ghost" title="Deactivate" className="text-red-600 hover:!bg-red-50" onClick={() => deactivate(u)}><UserMinus className="w-4 h-4" /></Button>}
      </div>
    ) : null) },
  ];

  if (error) return <ErrorState message={error} onRetry={load} />;

  const active = users.filter((u) => u.is_active).length;
  const deptOptions = [
    { value: 'all', label: 'All departments', count: users.length },
    ...DEPARTMENTS.filter((d) => deptCounts[d]).map((d) => ({ value: d, label: d, count: deptCounts[d] })),
    ...(deptCounts[COLLEGE_WIDE] ? [{ value: COLLEGE_WIDE, label: 'College-wide', count: deptCounts[COLLEGE_WIDE] }] : []),
  ];

  // Department picker shared by the create and edit forms (called as a function, not a component).
  const deptField = (form, setForm) => {
    if (!DEPARTMENT_ROLES.includes(form.role_name)) return null;
    if (!superAdmin) {
      return <Field label="Department"><div className="pt-1"><DeptBadge department={me?.department} /></div></Field>;
    }
    return (
      <Field label="Department" required hint={form.role_name === 'Admin' && form.department === ALL_DEPARTMENTS ? 'Super admin: sees and manages every department.' : undefined}>
        <Select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          {form.role_name === 'Admin' && <option value={ALL_DEPARTMENTS}>All departments (super admin)</option>}
        </Select>
      </Field>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={superAdmin ? 'Users & Roles' : `${me?.department} Faculty`}
        subtitle={superAdmin
          ? 'Every account, grouped by department. HODs see and manage only their own department.'
          : `People in ${me?.department}. You can add and manage faculty of your department.`}
        icon={UsersIcon}
        actions={<Button icon={Plus} onClick={() => { setCreateForm(emptyCreate()); setShowCreate(true); }}>{superAdmin ? 'Add user' : 'Add faculty'}</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard index={0} loading={loading} label="Total users" value={users.length} icon={UsersIcon} tone="brand" active={statusFilter === 'all' && roleFilter === 'all'} onClick={() => { setStatusFilter('all'); setRoleFilter('all'); }} />
        <StatCard index={1} loading={loading} label="Active" value={active} icon={UserCheck} tone="emerald" active={statusFilter === 'active'} onClick={() => setStatusFilter('active')} />
        <StatCard index={2} loading={loading} label="Inactive" value={users.length - active} icon={UserX} tone="red" active={statusFilter === 'inactive'} onClick={() => setStatusFilter('inactive')} />
        {superAdmin
          ? <StatCard index={3} loading={loading} label="Vendors with login" value={roleCounts.Vendor || 0} icon={Store} tone="violet" active={roleFilter === 'Vendor'} onClick={() => setRoleFilter(roleFilter === 'Vendor' ? 'all' : 'Vendor')} />
          : <StatCard index={3} loading={loading} label="Faculty" value={roleCounts[FACULTY] || 0} icon={GraduationCap} tone="blue" active={roleFilter === FACULTY} onClick={() => setRoleFilter(roleFilter === FACULTY ? 'all' : FACULTY)} />}
      </div>

      <div className="surface p-3 sm:p-4 space-y-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, department…" />
        {superAdmin && <FilterChips value={deptFilter} onChange={setDeptFilter} options={deptOptions} />}
        <FilterChips value={roleFilter} onChange={setRoleFilter} options={[{ value: 'all', label: 'All roles', count: users.length }, ...roles.filter((r) => roleCounts[r.role_name]).map((r) => ({ value: r.role_name, label: roleLabel(r.role_name), count: roleCounts[r.role_name] }))]} />
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey="user_id"
        loading={loading}
        initialSort={{ key: 'department', dir: 'asc' }}
        emptyIcon={Filter}
        emptyTitle="No users match"
        emptyDescription="Try another department or role, or clear the search."
        footer={<span>{filtered.length} of {users.length} users</span>}
        rowClassName={(u) => (!u.is_active ? 'opacity-70' : '')}
        expandable={(u) => (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KV label="User ID" value={`#${u.user_id}`} mono />
            <KV label="Role" value={roleLabel(u.role_name)} />
            <KV label="Department" value={u.department || (u.role_name === 'Admin' ? 'All departments' : 'College-wide')} />
            <KV label="Created" value={fmtDateTime(u.created_at)} />
            {u.vendor && <KV label="Vendor account" value={u.vendor.vendor_name} />}
          </div>
        )}
      />

      {/* Create */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} icon={Plus} title={superAdmin ? 'Add user' : 'Add faculty'} description="They can change their password after first login." footer={<><Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button><Button type="submit" form="create-user" loading={saving}>Create user</Button></>}>
        <form id="create-user" onSubmit={submitCreate} className="space-y-4">
          <Field label="Full name" required><Input required autoFocus value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} /></Field>
          <Field label="Email" required><Input type="email" required value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} leftIcon={Mail} /></Field>
          <Field label="Temporary password" required hint="Minimum 8 characters"><PasswordInput required minLength={8} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} autoComplete="new-password" /></Field>
          {creatableRoles.length > 1 && (
            <Field label="Role" required>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {creatableRoles.map((r) => {
                  const on = createForm.role_name === r.role_name;
                  return (
                    <button key={r.role_id} type="button" onClick={() => setCreateForm({ ...createForm, role_name: r.role_name })} className={`rounded-xl border px-3 py-2.5 text-left transition ${on ? 'border-brand-600 bg-brand-50 shadow-glow' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <span className="flex items-center gap-2"><Shield className={`w-3.5 h-3.5 ${on ? 'text-brand-700' : 'text-slate-400'}`} /><span className="text-sm font-medium text-slate-800">{roleLabel(r.role_name)}</span></span>
                    </button>
                  );
                })}
              </div>
            </Field>
          )}
          {deptField(createForm, setCreateForm)}
          <Field label="Phone"><Input type="tel" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} /></Field>
        </form>
      </Modal>

      {/* Edit */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} icon={Pencil} title={`Edit ${editUser?.name || ''}`} footer={<><Button variant="secondary" onClick={() => setEditUser(null)}>Cancel</Button><Button type="submit" form="edit-user" loading={saving}>Save changes</Button></>}>
        <form id="edit-user" onSubmit={submitEdit} className="space-y-4">
          <Field label="Full name" required><Input required value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></Field>
          <Field label="Email" required><Input type="email" required value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-4">
            {superAdmin ? (
              <Field label="Role">
                <Select value={editForm.role_name || ''} onChange={(e) => setEditForm({ ...editForm, role_name: e.target.value, department: editForm.department === ALL_DEPARTMENTS && e.target.value !== 'Admin' ? DEFAULT_DEPARTMENT : editForm.department })}>
                  {roles.map((r) => <option key={r.role_id} value={r.role_name}>{roleLabel(r.role_name)}</option>)}
                </Select>
              </Field>
            ) : (
              <Field label="Role"><div className="pt-1"><Badge tone="blue">Faculty</Badge></div></Field>
            )}
            {deptField(editForm, setEditForm)}
          </div>
          <Field label="Phone"><Input type="tel" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></Field>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
            <div><p className="text-sm font-medium text-slate-800">Account active</p><p className="text-xs text-slate-500">Inactive users cannot sign in.</p></div>
            <Switch checked={!!editForm.is_active} onChange={(v) => setEditForm({ ...editForm, is_active: v })} />
          </div>
        </form>
      </Modal>

      {/* Reset password */}
      <Modal open={!!resetUser} onClose={() => setResetUser(null)} size="sm" icon={KeyRound} title="Reset password" description={resetUser ? `${resetUser.name} · ${resetUser.email}` : ''} footer={<><Button variant="secondary" onClick={() => setResetUser(null)}>Cancel</Button><Button type="submit" form="reset-pw" loading={saving}>Reset password</Button></>}>
        <form id="reset-pw" onSubmit={submitReset} className="space-y-4">
          <Field label="New password" required hint="Minimum 8 characters"><PasswordInput required minLength={8} autoFocus value={resetForm.new_password} onChange={(e) => setResetForm({ ...resetForm, new_password: e.target.value })} autoComplete="new-password" /></Field>
          <Field label="Confirm password" required error={resetForm.confirm && resetForm.confirm !== resetForm.new_password ? 'Passwords do not match' : undefined}><PasswordInput required value={resetForm.confirm} onChange={(e) => setResetForm({ ...resetForm, confirm: e.target.value })} autoComplete="new-password" /></Field>
        </form>
      </Modal>

      {/* Change email */}
      <Modal open={!!emailUser} onClose={() => setEmailUser(null)} size="sm" icon={Mail} title="Change email" description={emailUser ? `Current: ${emailUser.email}` : ''} footer={<><Button variant="secondary" onClick={() => setEmailUser(null)}>Cancel</Button><Button type="submit" form="change-email" loading={saving}>Save email</Button></>}>
        <form id="change-email" onSubmit={submitEmail} className="space-y-4">
          <Field label="New email" required><Input type="email" required autoFocus value={emailForm.email} onChange={(e) => setEmailForm({ email: e.target.value })} /></Field>
        </form>
      </Modal>
    </div>
  );
}
