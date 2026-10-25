import { useCallback, useEffect, useState } from 'react';
import { Shield, Building2, Flag, Users, Inbox, CheckCircle2, XCircle, ShieldCheck, Crown, Ban } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { admin } from '../lib/api';
import { Avatar, EmptyState, PageLoader, SignInRequired, StatusPill, SafeImage, Modal, ErrorText } from '../components/ui';
import { formatDate, formatINR } from '../lib/format';

type Tab = 'listings' | 'reports' | 'users' | 'inquiries';

export function AdminPage() {
  const { auth, authLoading } = useApp();
  const [tab, setTab] = useState<Tab>('listings');
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const refreshStats = useCallback(() => admin.stats().then(setStats).catch(() => {}), []);
  useEffect(() => { if (auth?.role === 'admin') refreshStats(); }, [auth?.role, refreshStats]);

  if (authLoading) return <PageLoader />;
  if (!auth) return <SignInRequired />;
  if (auth.role !== 'admin') return <EmptyState icon={Shield} title="Admins only" desc="You don't have access to this page." />;

  const tabs: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'listings', label: 'Listings', icon: Building2, count: stats?.pendingListings },
    { key: 'reports', label: 'Reports', icon: Flag, count: stats?.openReports },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'inquiries', label: 'Expert requests', icon: Inbox, count: stats?.newInquiries },
  ];

  return (
    <div className="container-page py-8">
      <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Admin</h1>
      {stats && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[['Users', stats.users], ['Hosts', stats.owners], ['Live listings', stats.activeListings], ['Pending bookings', stats.pendingBookings]].map(([l, v]) => (
            <div key={l} className="card p-4"><p className="text-xl font-bold">{v}</p><p className="text-xs text-ink-500">{l}</p></div>
          ))}
        </div>
      )}
      <div className="mt-6 flex gap-2 overflow-x-auto border-b border-ink-100 dark:border-ink-800" role="tablist">
        {tabs.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${tab === t.key ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-500'}`}>
            <t.icon className="h-4 w-4" /> {t.label} {!!t.count && <span className="rounded-full bg-brand-500 px-1.5 text-xs font-bold text-white">{t.count}</span>}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === 'listings' && <ListingsAdmin onChange={refreshStats} />}
        {tab === 'reports' && <ReportsAdmin onChange={refreshStats} />}
        {tab === 'users' && <UsersAdmin />}
        {tab === 'inquiries' && <InquiriesAdmin onChange={refreshStats} />}
      </div>
    </div>
  );
}

function ListingsAdmin({ onChange }: { onChange: () => void }) {
  const { navigate, toast } = useApp();
  const [status, setStatus] = useState('pending_review');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState<any | null>(null);
  const load = useCallback(() => { setLoading(true); admin.listings(status).then((r) => setRows(r.listings)).finally(() => setLoading(false)); }, [status]);
  useEffect(load, [load]);
  const act = async (id: string, action: string, note = '') => {
    try { await admin.moderate(id, action, note); toast(`Done: ${action}`); load(); onChange(); } catch (e) { toast((e as Error).message, 'error'); }
  };
  return (
    <>
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="input mb-4" aria-label="Status filter">
        {[['pending_review', 'Awaiting review'], ['active', 'Live'], ['inactive', 'Paused'], ['rejected', 'Rejected']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {loading ? <PageLoader /> : rows.length === 0 ? <EmptyState icon={Building2} title="Nothing here" /> : (
        <div className="space-y-3">
          {rows.map((l) => (
            <div key={l.id} className="card flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
              <button onClick={() => navigate(`/listing/${l.id}`)}><SafeImage src={l.photos[0]} alt={l.title} width={160} className="h-20 w-28 rounded-xl object-cover" /></button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><button onClick={() => navigate(`/listing/${l.id}`)} className="font-semibold hover:text-brand-600">{l.title}</button><StatusPill status={l.status} />{l.verified && <span className="text-xs text-teal-600">Verified</span>}{l.featured && <span className="text-xs text-amber-600">Featured</span>}</div>
                <p className="text-xs text-ink-500">{l.locality}, {l.city} · {formatINR(l.price)} · {l.photos.length} photos · submitted {formatDate(l.createdAt)}</p>
                <p className="text-xs text-ink-500">Owner: {l.owner?.fullName} · {l.owner?.email} · {l.owner?.phone || 'no phone'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {l.status !== 'active' && <button onClick={() => act(l.id, 'approve')} className="btn-primary text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> Approve</button>}
                {l.status === 'pending_review' && <button onClick={() => setRejecting(l)} className="btn-outline text-xs"><XCircle className="h-3.5 w-3.5" /> Reject</button>}
                {l.status === 'active' && <>
                  <button onClick={() => act(l.id, l.verified ? 'unverify' : 'verify')} className="btn-outline text-xs"><ShieldCheck className="h-3.5 w-3.5" /> {l.verified ? 'Remove verified' : 'Mark inspected'}</button>
                  <button onClick={() => act(l.id, l.featured ? 'unfeature' : 'feature')} className="btn-outline text-xs"><Crown className="h-3.5 w-3.5" /> {l.featured ? 'Unfeature' : 'Feature'}</button>
                  <button onClick={() => window.confirm('Pause this listing?') && act(l.id, 'deactivate')} className="btn-ghost text-xs text-danger">Pause</button>
                </>}
              </div>
            </div>
          ))}
        </div>
      )}
      {rejecting && <NoteModal title={`Reject "${rejecting.title}"`} placeholder="Tell the owner what to fix (e.g. add real room photos)" onClose={() => setRejecting(null)} onSubmit={async (note) => { await admin.moderate(rejecting.id, 'reject', note); setRejecting(null); toast('Rejected — owner notified'); load(); onChange(); }} />}
    </>
  );
}

function ReportsAdmin({ onChange }: { onChange: () => void }) {
  const { navigate, toast } = useApp();
  const [status, setStatus] = useState('open');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => { setLoading(true); admin.reports(status).then((r) => setRows(r.reports)).finally(() => setLoading(false)); }, [status]);
  useEffect(load, [load]);
  const resolve = async (id: string, s: 'resolved' | 'dismissed', remove = false) => {
    try { await admin.resolveReport(id, s, remove); toast(`Report ${s}`); load(); onChange(); } catch (e) { toast((e as Error).message, 'error'); }
  };
  const targetLabel = (r: any) => r.target ? (r.target.title || r.target.fullName || (r.target.text ? `"${String(r.target.text).slice(0, 80)}"` : '')) : '(deleted)';
  return (
    <>
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="input mb-4" aria-label="Status filter">
        {['open', 'resolved', 'dismissed'].map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      {loading ? <PageLoader /> : rows.length === 0 ? <EmptyState icon={Flag} title="No reports" /> : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r._id} className="card p-4">
              <div className="flex flex-wrap items-center gap-2"><StatusPill status={r.status} /><span className="text-sm font-semibold capitalize">{r.targetType}: {r.reason.replace('_', ' ')}</span><span className="text-xs text-ink-500">{formatDate(r.createdAt)} by {r.reporterId?.fullName || 'deleted user'}</span></div>
              <p className="mt-1 text-sm">{targetLabel(r)}</p>
              {r.details && <p className="mt-1 text-sm italic text-ink-600 dark:text-ink-300">"{r.details}"</p>}
              {r.status === 'open' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.targetType === 'listing' && r.target && <button onClick={() => navigate(`/listing/${r.targetId}`)} className="btn-ghost text-xs">Open listing</button>}
                  {r.targetType !== 'message' && <button onClick={() => window.confirm(r.targetType === 'user' ? 'Suspend this user?' : r.targetType === 'listing' ? 'Pause this listing?' : 'Delete this review?') && resolve(r._id, 'resolved', true)} className="btn-primary text-xs">Take down & resolve</button>}
                  <button onClick={() => resolve(r._id, 'resolved')} className="btn-outline text-xs">Resolve (no action)</button>
                  <button onClick={() => resolve(r._id, 'dismissed')} className="btn-ghost text-xs">Dismiss</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function UsersAdmin() {
  const { toast } = useApp();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [suspending, setSuspending] = useState<any | null>(null);
  const load = useCallback(() => { admin.users(q).then((r) => setRows(r.users)).catch(() => {}); }, [q]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);
  const update = async (id: string, body: Record<string, unknown>, msg: string) => {
    try { await admin.updateUser(id, body); toast(msg); load(); } catch (e) { toast((e as Error).message, 'error'); }
  };
  return (
    <>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" className="input mb-4 w-full max-w-sm" aria-label="Search users" />
      <div className="space-y-2">
        {rows.map((u) => (
          <div key={u.id} className="card flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
            <Avatar src={u.avatar} name={u.fullName} className="h-10 w-10 rounded-full" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{u.fullName} <span className="font-normal capitalize text-ink-500">· {u.role}</span> {u.suspended && <span className="text-xs text-danger">· suspended</span>} {u.verified && <span className="text-xs text-teal-600">· ID verified</span>}</p>
              <p className="text-xs text-ink-500">{u.email} · {u.phone || 'no phone'} · joined {formatDate(u.createdAt)} {u.emailVerified ? '· email ✓' : '· email unconfirmed'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => update(u.id, { verified: !u.verified }, u.verified ? 'Verification removed' : 'Marked as ID verified')} className="btn-outline text-xs"><ShieldCheck className="h-3.5 w-3.5" /> {u.verified ? 'Unverify' : 'Verify ID'}</button>
              {u.role !== 'admin' && (u.suspended
                ? <button onClick={() => update(u.id, { suspended: false }, 'User reinstated')} className="btn-outline text-xs">Reinstate</button>
                : <button onClick={() => setSuspending(u)} className="btn-ghost text-xs text-danger"><Ban className="h-3.5 w-3.5" /> Suspend</button>)}
            </div>
          </div>
        ))}
      </div>
      {suspending && <NoteModal title={`Suspend ${suspending.fullName}?`} placeholder="Reason (internal)" onClose={() => setSuspending(null)} onSubmit={async (reason) => { await admin.updateUser(suspending.id, { suspended: true, reason }); setSuspending(null); toast('User suspended and logged out; listings paused'); load(); }} />}
    </>
  );
}

function InquiriesAdmin({ onChange }: { onChange: () => void }) {
  const { toast } = useApp();
  const [rows, setRows] = useState<any[]>([]);
  const load = useCallback(() => { admin.inquiries().then((r) => setRows(r.inquiries)).catch(() => {}); }, []);
  useEffect(load, [load]);
  return rows.length === 0 ? <EmptyState icon={Inbox} title="No expert requests yet" /> : (
    <div className="space-y-3">
      {rows.map((i) => (
        <div key={i._id} className="card p-4">
          <div className="flex flex-wrap items-center gap-2"><StatusPill status={i.status} /><span className="font-semibold">{i.name}</span><span className="text-xs text-ink-500">{formatDate(i.createdAt)}</span></div>
          <p className="mt-1 text-sm">{[i.email, i.phone].filter(Boolean).join(' · ')}</p>
          <p className="text-sm text-ink-600 dark:text-ink-300">{[i.city, i.locality].filter(Boolean).join(', ')} {i.budget ? `· up to ${formatINR(i.budget)}` : ''} {i.moveInDate ? `· move-in ${formatDate(i.moveInDate)}` : ''}</p>
          {i.message && <p className="mt-1 text-sm italic">"{i.message}"</p>}
          <div className="mt-3 flex gap-2">
            {['new', 'contacted', 'closed'].filter((s) => s !== i.status).map((s) => (
              <button key={s} onClick={async () => { await admin.updateInquiry(i._id, s); toast(`Marked ${s}`); load(); onChange(); }} className="btn-outline text-xs capitalize">Mark {s}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function NoteModal({ title, placeholder, onClose, onSubmit }: { title: string; placeholder: string; onClose: () => void; onSubmit: (note: string) => Promise<void> }) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onClose}>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} className="input w-full resize-none" placeholder={placeholder} />
      <div className="mt-3"><ErrorText>{error}</ErrorText></div>
      <div className="mt-4 flex gap-3">
        <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
        <button disabled={!note.trim() || busy} onClick={async () => { setBusy(true); try { await onSubmit(note.trim()); } catch (e) { setError((e as Error).message); setBusy(false); } }} className="btn-primary flex-1">Confirm</button>
      </div>
    </Modal>
  );
}
