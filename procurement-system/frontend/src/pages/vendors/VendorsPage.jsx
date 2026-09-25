import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Truck, Ban, CheckCircle2, Mail, Phone, MapPin, User, Users, ShieldOff, Copy, Check, Filter } from 'lucide-react';
import api from '../../api/axios';
import SpotlightCard from '../../components/reactbits/SpotlightCard/SpotlightCard';
import { PageHeader, StatCard, Button, Modal, Field, Input, Textarea, SearchInput, FilterChips, StatusBadge, Avatar, EmptyState, useToast, useConfirm, ErrorState } from '../../components/ui';
import { dataOf, errMsg, cn } from '../../lib/utils';

const EMPTY = { vendor_name: '', contact_person: '', email: '', phone: '', address: '' };

export default function VendorsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get('/vendors');
      setVendors(dataOf(r));
    } catch (e) {
      setError(errMsg(e, 'Failed to load vendors'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vendors.filter((v) => {
      if (filter === 'active' && v.is_blacklisted) return false;
      if (filter === 'blacklisted' && !v.is_blacklisted) return false;
      if (!q) return true;
      return [v.vendor_name, v.company_name, v.email, v.contact_person, v.phone].some((x) => String(x || '').toLowerCase().includes(q));
    });
  }, [vendors, search, filter]);

  const blacklisted = vendors.filter((v) => v.is_blacklisted).length;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/vendors', form);
      setCreated(res.data?.data || res.data);
      toast.success(`${form.vendor_name} added`, { title: 'Vendor created' });
      setForm(EMPTY);
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to create vendor'));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (v) => {
    const ok = await confirm({
      title: v.is_blacklisted ? `Reactivate ${v.vendor_name}?` : `Blacklist ${v.vendor_name}?`,
      message: v.is_blacklisted ? 'They will be eligible for RFQs again.' : 'Blacklisted vendors are hidden from RFQ selection and cannot log in to the portal.',
      tone: v.is_blacklisted ? 'default' : 'danger',
      confirmText: v.is_blacklisted ? 'Reactivate' : 'Blacklist',
    });
    if (!ok) return;
    try {
      await api.put(`/vendors/${v.vendor_id}/toggle-status`);
      toast.success(v.is_blacklisted ? `${v.vendor_name} reactivated` : `${v.vendor_name} blacklisted`);
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Update failed'));
    }
  };

  const copyCreds = () => {
    const email = created?.vendor?.email || created?.email || form.email;
    navigator.clipboard?.writeText(`${email} / vendor123`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        subtitle="Approved suppliers who receive RFQs, submit quotations and fulfil work orders."
        icon={Truck}
        actions={<Button icon={Plus} onClick={() => { setCreated(null); setOpen(true); }}>Add vendor</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard index={0} loading={loading} label="Registered vendors" value={vendors.length} icon={Users} tone="brand" active={filter === 'all'} onClick={() => setFilter('all')} />
        <StatCard index={1} loading={loading} label="Active" value={vendors.length - blacklisted} icon={CheckCircle2} tone="emerald" active={filter === 'active'} onClick={() => setFilter('active')} />
        <StatCard index={2} loading={loading} label="Blacklisted" value={blacklisted} icon={ShieldOff} tone="red" active={filter === 'blacklisted'} onClick={() => setFilter('blacklisted')} />
        <StatCard index={3} loading={loading} label="With portal login" value={vendors.filter((v) => v.user_id || v.user).length || vendors.length} icon={User} tone="violet" hint="Auto-created on add" />
      </div>

      <div className="surface p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search vendor, contact, email…" className="flex-1" />
        <FilterChips value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All', count: vendors.length }, { value: 'active', label: 'Active', count: vendors.length - blacklisted, dot: 'bg-emerald-500' }, { value: 'blacklisted', label: 'Blacklisted', count: blacklisted, dot: 'bg-red-500' }]} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="surface p-5 h-48 skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface">
          <EmptyState icon={vendors.length ? Filter : Truck} title={vendors.length ? 'No vendors match' : 'No vendors yet'} description={vendors.length ? 'Try clearing the search or filter.' : 'Add your first supplier — a portal login is created automatically.'} action={!vendors.length && <Button icon={Plus} onClick={() => setOpen(true)}>Add vendor</Button>} />
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((v, i) => (
            <motion.div key={v.vendor_id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }}>
              <SpotlightCard spotlightColor={v.is_blacklisted ? 'rgba(239,68,68,0.12)' : 'rgba(46,117,182,0.14)'} className={cn('!rounded-2xl !p-5 !bg-white !border-slate-200/80 shadow-card h-full transition-shadow hover:shadow-card-hover', v.is_blacklisted && 'opacity-90')}>
                <div className="flex items-start gap-3">
                  <Avatar name={v.vendor_name} size="lg" solid className={cn(v.is_blacklisted && 'grayscale')} />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-semibold text-slate-900 truncate">{v.vendor_name}</h3>
                    <p className="text-xs text-slate-500 truncate">{v.company_name || v.contact_person || 'Supplier'}</p>
                  </div>
                  <StatusBadge status={v.is_blacklisted ? 'blacklisted' : 'active'} pulse={false} />
                </div>
                <div className="mt-4 space-y-1.5 text-[13px]">
                  {v.contact_person && <Row icon={User} text={v.contact_person} />}
                  <Row icon={Mail} text={v.email} href={`mailto:${v.email}`} />
                  {v.phone && <Row icon={Phone} text={v.phone} href={`tel:${v.phone}`} />}
                  {v.address && <Row icon={MapPin} text={v.address} />}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">ID #{v.vendor_id}{v.rating != null ? ` · ★ ${v.rating}` : ''}</span>
                  <Button size="xs" variant={v.is_blacklisted ? 'success-soft' : 'danger-soft'} icon={v.is_blacklisted ? CheckCircle2 : Ban} onClick={() => toggle(v)}>
                    {v.is_blacklisted ? 'Reactivate' : 'Blacklist'}
                  </Button>
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Modal
        open={open}
        onClose={() => { setOpen(false); setCreated(null); }}
        icon={Truck}
        title={created ? 'Vendor created' : 'Add vendor'}
        description={created ? 'Share these portal credentials with the vendor.' : 'A portal login is created automatically for the vendor.'}
        footer={
          created ? (
            <Button onClick={() => { setOpen(false); setCreated(null); }}>Done</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" form="add-vendor" loading={saving}>Create vendor</Button>
            </>
          )
        }
      >
        {created ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-sm text-emerald-900 whitespace-pre-line">{created.message || 'Vendor account created with portal access.'}</div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Portal login</p>
              <div className="flex items-center justify-between gap-3">
                <div className="font-mono text-sm text-slate-800">
                  <p>{created?.vendor?.email || created?.email || '—'}</p>
                  <p className="text-slate-500">password: vendor123</p>
                </div>
                <Button size="sm" variant="secondary" icon={copied ? Check : Copy} onClick={copyCreds}>{copied ? 'Copied' : 'Copy'}</Button>
              </div>
            </div>
          </div>
        ) : (
          <form id="add-vendor" onSubmit={submit} className="space-y-4">
            <Field label="Company / vendor name" required>
              <Input required autoFocus value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} placeholder="e.g. TechCorp Solutions" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Contact person">
                <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
              </Field>
              <Field label="Phone">
                <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
            </div>
            <Field label="Email" required hint="Used as the vendor's portal login">
              <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="vendor@company.com" leftIcon={Mail} />
            </Field>
            <Field label="Address">
              <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} />
            </Field>
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-xs text-amber-900">
              A portal account is auto-created with the default password <code className="font-mono bg-amber-100 px-1 rounded">vendor123</code>. Ask the vendor to change it after first login.
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function Row({ icon: Icon, text, href }) {
  const inner = (
    <>
      <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <span className="truncate">{text}</span>
    </>
  );
  return href ? (
    <a href={href} className="flex items-center gap-2 text-slate-600 hover:text-brand-700 transition" onClick={(e) => e.stopPropagation()}>
      {inner}
    </a>
  ) : (
    <p className="flex items-center gap-2 text-slate-600">{inner}</p>
  );
}
