'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { Badge, Empty, ErrorBanner, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { END_TIMES, START_TIMES, dayRangeIso, fmtDateTime, fmtTime, localDateStr, localToIso } from '@/lib/time';

export default function ResourceDetail() {
  const { id } = useParams();
  const [resource, setResource] = useState(null);
  const [error, setError] = useState('');
  const [date, setDate] = useState(localDateStr());
  const [slots, setSlots] = useState(null);
  const [slotsErr, setSlotsErr] = useState('');
  const [tickets, setTickets] = useState([]);
  const [form, setForm] = useState({ start: '09:00', end: '09:30', purpose: '', ticketId: '' });
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    api(`/resources/${id}`).then(setResource).catch((e) => setError(e.message));
    api('/tickets', { params: { limit: 100 } }).then((r) => setTickets(r.data)).catch(() => {});
  }, [id]);

  const loadSlots = useCallback(async () => {
    setSlots(null); setSlotsErr('');
    try {
      const [from, to] = dayRangeIso(date);
      setSlots((await api(`/resources/${id}/availability`, { params: { from, to } })).bookings);
    } catch (e) { setSlotsErr(e.message); }
  }, [id, date]);
  useEffect(() => { if (resource) loadSlots(); }, [resource, loadSlots]);

  async function submit(e) {
    e.preventDefault();
    setFormErr(''); setOk('');
    const startTime = localToIso(date, form.start);
    const endTime = localToIso(date, form.end);
    if (new Date(endTime) <= new Date(startTime)) return setFormErr('End time must be after start time.');
    if (form.purpose.trim().length < 5) return setFormErr('Purpose must be at least 5 characters.');
    setBusy(true);
    try {
      await api('/bookings', { method: 'POST', body: { resourceId: id, startTime, endTime, purpose: form.purpose.trim(), ...(form.ticketId ? { ticketId: form.ticketId } : {}) } });
      setOk('Booking requested. It is pending admin approval.');
      setForm((s) => ({ ...s, purpose: '', ticketId: '' }));
      loadSlots();
    } catch (err) { setFormErr(err.message); }
    setBusy(false);
  }

  if (error) return <Shell><ErrorBanner message={error} /><Link className="mt-3 inline-block text-signal-700 underline" href="/resources">Back to resources</Link></Shell>;
  if (!resource) return <Shell><Spinner label="Loading resource…" /></Shell>;

  return (
    <Shell>
      <div className="space-y-4">
        <Link className="text-sm text-signal-700 underline" href="/resources">← All resources</Link>
        <div className="panel">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="min-w-0 break-words text-xl font-semibold">{resource.name}</h1>
            <div className="flex gap-1.5"><Badge value={resource.type} />{!resource.isActive && <span className="badge bg-red-100 text-red-800">Inactive</span>}</div>
          </div>
          <p className="mt-1 text-sm text-ink-500">Capacity {resource.capacity}</p>
          {resource.description && <p className="mt-2 break-words text-sm">{resource.description}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <section className="panel space-y-3">
            <h2 className="font-semibold">Availability</h2>
            <div><label className="label" htmlFor="d">Date</label><input id="d" type="date" className="input" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></div>
            <ErrorBanner message={slotsErr} onRetry={loadSlots} />
            {!slots && !slotsErr ? <Spinner label="Loading slots…" /> : slots && slots.length === 0 ? (
              <Empty title="Nothing booked" hint="The whole day is free." />
            ) : slots && (
              <ul className="space-y-2">
                {slots.map((s, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded border border-ink-100 p-2 text-sm">
                    <span>{fmtTime(s.startTime)} – {fmtTime(s.endTime)}</span><Badge value={s.status} />
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-ink-500">Times shown in your local timezone.</p>
          </section>

          <form onSubmit={submit} className="panel space-y-3">
            <h2 className="font-semibold">Book this resource</h2>
            {!resource.isActive && <p className="text-sm text-red-700">This resource is inactive and cannot be booked.</p>}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label" htmlFor="st">Start</label>
                <select id="st" className="input" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })}>{START_TIMES.map((t) => <option key={t}>{t}</option>)}</select></div>
              <div><label className="label" htmlFor="en">End</label>
                <select id="en" className="input" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })}>{END_TIMES.map((t) => <option key={t}>{t}</option>)}</select></div>
            </div>
            <p className="text-xs text-ink-500">Date: {date}. 30–240 minutes, starting within the next 30 days.</p>
            <div><label className="label" htmlFor="pu">Purpose</label><textarea id="pu" className="input h-20" maxLength={200} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></div>
            <div><label className="label" htmlFor="tk">Linked ticket (optional)</label>
              <select id="tk" className="input" value={form.ticketId} onChange={(e) => setForm({ ...form, ticketId: e.target.value })}>
                <option value="">None</option>
                {tickets.map((t) => <option key={t.id} value={t.id}>{t.externalId} – {t.subject.slice(0, 40)}</option>)}
              </select></div>
            <ErrorBanner message={formErr} onDismiss={() => setFormErr('')} />
            {ok && <p role="status" className="rounded-md bg-emerald-50 p-2 text-sm text-emerald-900">{ok}</p>}
            <button className="btn-primary w-full" disabled={busy || !resource.isActive}>{busy ? 'Requesting…' : 'Request booking'}</button>
          </form>
        </div>
      </div>
    </Shell>
  );
}
