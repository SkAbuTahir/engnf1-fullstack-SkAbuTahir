'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './AuthProvider';
import { fmtDateTime } from '@/lib/time';
import { Badge, ErrorBanner, Spinner, label } from './ui';
import C from '@/lib/constants';

// NOTE (T-B5): subject/body are rendered as plain React text nodes => HTML/script payloads are escaped,
// never injected. There is no dangerouslySetInnerHTML anywhere in this app.
export default function TicketDrawer({ ticket: initial, onChange, onSaved, onClose }) {
  const { user } = useAuth();
  const [ticket, setTicket] = useState(initial);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api(`/tickets/${initial.id}`)
      .then((r) => { if (alive) { setTicket(r.ticket); setEvents(r.events); } })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [initial.id]);

  // Optimistic update: apply locally first, send PATCH, roll back + show banner if the server rejects it.
  async function change(field, value) {
    if (ticket[field] === value) return;
    const prev = ticket;
    const optimistic = { ...ticket, [field]: value };
    if (field === 'category') { optimistic.isHumanOverride = true; optimistic.isReviewed = true; }
    if (field === 'status' && prev.status === 'OPEN' && value !== 'OPEN') optimistic.isReviewed = true;
    setTicket(optimistic);
    onChange(optimistic);
    setError('');
    try {
      const r = await api(`/tickets/${ticket.id}`, { method: 'PATCH', body: { [field]: value }, headers: { 'X-Agent': user.name } });
      setTicket(r.ticket);
      setEvents(r.events);
      onChange(r.ticket);
      onSaved();
    } catch (e) {
      setTicket(prev);
      onChange(prev);
      setError(`Could not save ${label(field).toLowerCase()}: ${e.message}. Your change was reverted.`);
    }
  }

  const Select = ({ field, options }) => (
    <div>
      <label className="label" htmlFor={`f-${field}`}>{label(field)}</label>
      <select id={`f-${field}`} className="input" value={ticket[field]} onChange={(e) => change(field, e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{label(o)}</option>)}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink-900/40" onClick={onClose}>
      <aside role="dialog" aria-label="Ticket detail" onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-md space-y-4 overflow-y-auto bg-white p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-ink-500">{ticket.externalId}</p>
            <h2 className="break-words text-lg font-semibold">{ticket.subject}</h2>
          </div>
          <button aria-label="Close" className="text-ink-500 hover:text-ink-900" onClick={onClose}>✕</button>
        </div>
        <ErrorBanner message={error} onDismiss={() => setError('')} />
        <p className="whitespace-pre-wrap break-words rounded-md bg-ink-50 p-3 text-sm">{ticket.body}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge value={ticket.category} />
          <span className="badge bg-ink-100 text-ink-700">Auto: {label(ticket.autoCategory)}</span>
          {ticket.isHumanOverride && <span className="badge bg-amber-100 text-amber-900">Human override</span>}
          {ticket.isReviewed && <span className="badge bg-emerald-100 text-emerald-800">Reviewed</span>}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select field="category" options={C.CATEGORIES} />
          <Select field="priority" options={C.PRIORITIES} />
          <Select field="status" options={C.TICKET_STATUSES} />
          <div>
            <span className="label">Assignee</span>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ink-500">{ticket.assigneeId ? (ticket.assigneeId === user.id ? 'You' : `…${ticket.assigneeId.slice(-6)}`) : 'Unassigned'}</span>
              {ticket.assigneeId !== user.id && <button className="btn-secondary px-2 py-1" onClick={() => change('assigneeId', user.id)}>Assign to me</button>}
              {ticket.assigneeId && <button className="btn-secondary px-2 py-1" onClick={() => change('assigneeId', null)}>Unassign</button>}
            </div>
          </div>
        </div>
        <section>
          <h3 className="mb-2 text-sm font-semibold">Audit trail</h3>
          {loading ? <Spinner label="Loading history…" /> : events.length === 0 ? (
            <p className="text-sm text-ink-500">No changes recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {events.map((e) => (
                <li key={e.id} className="rounded border border-ink-100 p-2 text-sm">
                  <p className="break-words"><strong>{label(e.field)}</strong>: {e.oldValue ?? '—'} → {e.newValue ?? '—'}</p>
                  <p className="break-words text-xs text-ink-500">{e.actor} · {fmtDateTime(e.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}
