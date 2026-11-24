'use client';
import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { Badge, Empty, ErrorBanner, Modal, Pagination, Spinner, label } from '@/components/ui';
import { api } from '@/lib/api';
import { fmtDateTime } from '@/lib/time';
import C from '@/lib/constants';

export default function MyBookings() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancel, setCancel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cancelErr, setCancelErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await api('/bookings/mine', { params: { status, page } })); } catch (e) { setError(e.message); }
    setLoading(false);
  }, [status, page]);
  useEffect(() => { load(); }, [load]);

  async function doCancel() {
    setBusy(true); setCancelErr('');
    try { await api(`/bookings/${cancel.id}/cancel`, { method: 'PATCH' }); setCancel(null); load(); } catch (e) { setCancelErr(e.message); }
    setBusy(false);
  }
  const canCancel = (b) => ['PENDING', 'APPROVED'].includes(b.status) && new Date(b.startTime) > new Date();

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-xl font-semibold">My bookings</h1>
          <div className="w-full sm:w-48">
            <label className="label" htmlFor="bs">Status</label>
            <select id="bs" className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All</option>{C.BOOKING_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
          </div>
        </div>
        <ErrorBanner message={error} onRetry={load} />
        {loading && !data ? <Spinner label="Loading bookings…" /> : data && data.data.length === 0 ? (
          <Empty title="No bookings yet" hint="Open a resource and request a slot." />
        ) : data && (
          <div className={loading ? 'opacity-60' : ''}>
            <ul className="space-y-2">
              {data.data.map((b) => (
                <li key={b.id} className="panel">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-medium">{b.resource?.name || 'Resource'}</p>
                      <p className="text-sm text-ink-500">{fmtDateTime(b.startTime)} – {fmtDateTime(b.endTime)}</p>
                    </div>
                    <Badge value={b.status} />
                  </div>
                  <p className="mt-1 break-words text-sm">{b.purpose}</p>
                  {b.decisionNote && <p className="mt-1 break-words text-sm text-red-700">Admin note: {b.decisionNote}</p>}
                  {canCancel(b) && <button className="btn-secondary mt-2" onClick={() => { setCancelErr(''); setCancel(b); }}>Cancel booking</button>}
                </li>
              ))}
            </ul>
            <Pagination page={data.page} totalPages={data.totalPages} onPage={setPage} />
          </div>
        )}
      </div>
      {cancel && (
        <Modal title="Cancel this booking?" onClose={() => setCancel(null)}>
          <p className="text-sm">{cancel.resource?.name} on {fmtDateTime(cancel.startTime)} will be released for others.</p>
          <div className="mt-3"><ErrorBanner message={cancelErr} /></div>
          <div className="mt-4 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setCancel(null)}>Keep booking</button>
            <button className="btn-danger" onClick={doCancel} disabled={busy}>{busy ? 'Cancelling…' : 'Cancel booking'}</button>
          </div>
        </Modal>
      )}
    </Shell>
  );
}
