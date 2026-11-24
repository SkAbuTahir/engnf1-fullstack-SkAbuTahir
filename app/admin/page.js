'use client';
import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { Badge, Empty, ErrorBanner, Modal, Pagination, Spinner, label } from '@/components/ui';
import { api } from '@/lib/api';
import { fmtDateTime } from '@/lib/time';
import C from '@/lib/constants';

function Analytics() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => { setErr(''); api('/admin/stats').then(setS).catch((e) => setErr(e.message)); }, []);
  useEffect(load, [load]);
  if (err) return <ErrorBanner message={err} onRetry={load} />;
  if (!s) return <Spinner label="Loading analytics…" />;
  const max = Math.max(1, ...Object.values(s.bookingsByStatus));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="panel"><p className="text-xs text-ink-500">Active resources</p><p className="text-2xl font-semibold">{s.activeResources}</p></div>
        <div className="panel"><p className="text-xs text-ink-500">Tickets</p><p className="text-2xl font-semibold">{Object.values(s.ticketStats.byStatus).reduce((a, b) => a + b, 0)}</p></div>
        <div className="panel"><p className="text-xs text-ink-500">Reviewed tickets</p><p className="text-2xl font-semibold">{s.ticketStats.reviewedCount}</p></div>
        <div className="panel"><p className="text-xs text-ink-500">Model agreement</p><p className="text-2xl font-semibold">{s.ticketStats.modelAgreementRate}%</p></div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="panel">
          <h2 className="mb-3 font-semibold">Bookings by status</h2>
          <ul className="space-y-2">
            {C.BOOKING_STATUSES.map((k) => (
              <li key={k} className="text-sm">
                <div className="mb-0.5 flex justify-between"><span>{label(k)}</span><span>{s.bookingsByStatus[k]}</span></div>
                <div className="h-2 rounded bg-ink-100"><div className="h-2 rounded bg-signal-600" style={{ width: `${(s.bookingsByStatus[k] / max) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <h2 className="mb-3 font-semibold">Top resources</h2>
          {s.topResources.length === 0 ? <p className="text-sm text-ink-500">No bookings yet.</p> : (
            <ol className="space-y-2">{s.topResources.map((r) => (
              <li key={r.resourceId} className="flex justify-between gap-2 text-sm"><span className="min-w-0 break-words">{r.name}</span><span className="shrink-0 font-medium">{r.bookingCount}</span></li>
            ))}</ol>
          )}
        </section>
      </div>
    </div>
  );
}

function ResourceForm({ initial, onClose, onSaved }) {
  const [f, setF] = useState({ name: initial?.name || '', type: initial?.type || 'ROOM', capacity: initial?.capacity ?? 1, description: initial?.description || '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault(); setErr('');
    const body = { name: f.name.trim(), type: f.type, capacity: Number(f.capacity), description: f.description.trim() || null };
    if (body.name.length < 3 || body.name.length > 60) return setErr('Name must be 3–60 characters.');
    if (!Number.isInteger(body.capacity) || body.capacity < 1 || body.capacity > 500) return setErr('Capacity must be a whole number from 1 to 500.');
    setBusy(true);
    try { await api(initial ? `/resources/${initial.id}` : '/resources', { method: initial ? 'PATCH' : 'POST', body }); onSaved(); onClose(); }
    catch (e2) { setErr(e2.message); setBusy(false); }
  }
  return (
    <Modal title={initial ? 'Edit resource' : 'New resource'} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div><label className="label" htmlFor="rn">Name</label><input id="rn" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="rt">Type</label><select id="rt" className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{C.RESOURCE_TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}</select></div>
          <div><label className="label" htmlFor="rc">Capacity</label><input id="rc" type="number" className="input" value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} /></div>
        </div>
        <div><label className="label" htmlFor="rd">Description</label><textarea id="rd" className="input h-20" maxLength={300} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <ErrorBanner message={err} />
        <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save resource'}</button></div>
      </form>
    </Modal>
  );
}

function ResourcesAdmin() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState(undefined); // undefined = closed, null = new, object = edit
  const load = useCallback(async () => { setErr(''); try { setData(await api('/resources', { params: { page } })); } catch (e) { setErr(e.message); } }, [page]);
  useEffect(() => { load(); }, [load]);
  async function toggle(r) {
    try { await api(`/resources/${r.id}`, { method: 'PATCH', body: { isActive: !r.isActive } }); load(); } catch (e) { setErr(e.message); }
  }
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><button className="btn-primary" onClick={() => setEdit(null)}>New resource</button></div>
      <ErrorBanner message={err} onRetry={load} />
      {!data && !err ? <Spinner /> : data && data.data.length === 0 ? <Empty title="No resources" hint="Create the first one." /> : data && (
        <>
          <ul className="space-y-2">{data.data.map((r) => (
            <li key={r.id} className="panel flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0"><p className="break-words font-medium">{r.name}</p><p className="text-sm text-ink-500">{label(r.type)} · capacity {r.capacity}</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`badge ${r.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{r.isActive ? 'Active' : 'Inactive'}</span>
                <button className="btn-secondary px-2 py-1" onClick={() => toggle(r)}>{r.isActive ? 'Deactivate' : 'Activate'}</button>
                <button className="btn-secondary px-2 py-1" onClick={() => setEdit(r)}>Edit</button>
              </div>
            </li>))}</ul>
          <Pagination page={data.page} totalPages={data.totalPages} onPage={setPage} />
        </>
      )}
      {edit !== undefined && <ResourceForm initial={edit} onClose={() => setEdit(undefined)} onSaved={load} />}
    </div>
  );
}

function BookingsAdmin() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [reject, setReject] = useState(null);
  const [note, setNote] = useState('');
  const [noteErr, setNoteErr] = useState('');
  const load = useCallback(async () => { setErr(''); try { setData(await api('/bookings', { params: { status, page } })); } catch (e) { setErr(e.message); } }, [status, page]);
  useEffect(() => { load(); }, [load]);
  const pending = (b) => b.status === 'PENDING' && new Date(b.startTime) > new Date();
  async function approve(b) { try { await api(`/bookings/${b.id}/approve`, { method: 'PATCH' }); load(); } catch (e) { setErr(e.message); } }
  async function doReject() {
    if (note.trim().length < 5 || note.trim().length > 200) return setNoteErr('Rejection note must be 5–200 characters.');
    try { await api(`/bookings/${reject.id}/reject`, { method: 'PATCH', body: { note: note.trim() } }); setReject(null); setNote(''); load(); } catch (e) { setNoteErr(e.message); }
  }
  return (
    <div className="space-y-3">
      <div className="w-full sm:w-48"><label className="label" htmlFor="ab">Status</label>
        <select id="ab" className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All</option>{C.BOOKING_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></div>
      <ErrorBanner message={err} onRetry={load} />
      {!data && !err ? <Spinner /> : data && data.data.length === 0 ? <Empty title="No bookings" hint="Nothing matches this filter." /> : data && (
        <>
          <ul className="space-y-2">{data.data.map((b) => (
            <li key={b.id} className="panel">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0"><p className="break-words font-medium">{b.resource?.name}</p><p className="text-sm text-ink-500">{fmtDateTime(b.startTime)} – {fmtDateTime(b.endTime)}</p>
                  <p className="break-words text-sm text-ink-500">By {b.user?.name} ({b.user?.email})</p></div>
                <Badge value={b.status} />
              </div>
              <p className="mt-1 break-words text-sm">{b.purpose}</p>
              {b.decisionNote && <p className="mt-1 break-words text-sm text-red-700">Note: {b.decisionNote}</p>}
              {pending(b) && <div className="mt-2 flex gap-2"><button className="btn-primary" onClick={() => approve(b)}>Approve</button><button className="btn-secondary" onClick={() => { setReject(b); setNote(''); setNoteErr(''); }}>Reject</button></div>}
            </li>))}</ul>
          <Pagination page={data.page} totalPages={data.totalPages} onPage={setPage} />
        </>
      )}
      {reject && (
        <Modal title="Reject booking" onClose={() => setReject(null)}>
          <label className="label" htmlFor="rj">Reason (required, 5–200 characters)</label>
          <textarea id="rj" className="input h-24" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="mt-3"><ErrorBanner message={noteErr} /></div>
          <div className="mt-4 flex justify-end gap-2"><button className="btn-secondary" onClick={() => setReject(null)}>Cancel</button><button className="btn-danger" onClick={doReject}>Reject booking</button></div>
        </Modal>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState('analytics');
  const tabs = [['analytics', 'Analytics'], ['resources', 'Resources'], ['bookings', 'Bookings']];
  return (
    <Shell admin>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Admin</h1>
        <div role="tablist" className="flex flex-wrap gap-1 border-b border-ink-100">
          {tabs.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm ${tab === k ? 'border-signal-600 font-medium text-signal-700' : 'border-transparent text-ink-500 hover:text-ink-900'}`}>{l}</button>
          ))}
        </div>
        {tab === 'analytics' && <Analytics />}
        {tab === 'resources' && <ResourcesAdmin />}
        {tab === 'bookings' && <BookingsAdmin />}
      </div>
    </Shell>
  );
}
