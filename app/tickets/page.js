'use client';
import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import TicketDrawer from '@/components/TicketDrawer';
import ImportModal from '@/components/ImportModal';
import { Badge, Empty, ErrorBanner, Pagination, Spinner, label } from '@/components/ui';
import { api } from '@/lib/api';
import { fmtDateTime } from '@/lib/time';
import C from '@/lib/constants';

const PAGE_SIZE = 10;

function StatsStrip({ stats }) {
  if (!stats) return <div className="panel"><Spinner label="Loading stats…" /></div>;
  const total = Object.values(stats.byStatus).reduce((a, b) => a + b, 0);
  const Card = ({ title, value, sub }) => (
    <div className="panel min-w-0">
      <p className="text-xs text-ink-500">{title}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {sub && <p className="truncate text-xs text-ink-500">{sub}</p>}
    </div>
  );
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card title="Total tickets" value={total} sub={`${stats.byStatus.OPEN} open · ${stats.byStatus.IN_PROGRESS} in progress`} />
      <Card title="Reviewed" value={stats.reviewedCount} sub={`${total ? Math.round((stats.reviewedCount / total) * 100) : 0}% of queue`} />
      <Card title="Model agreement" value={`${stats.modelAgreementRate}%`} sub="Agents kept the auto category" />
      <Card title="Urgent / High" value={`${stats.byPriority.URGENT} / ${stats.byPriority.HIGH}`} sub={`${stats.byCategory.BUG} bugs · ${stats.byCategory.BILLING} billing`} />
    </div>
  );
}

export default function TicketsPage() {
  const [filters, setFilters] = useState({ status: '', category: '', priority: '', q: '' });
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [list, setList] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(filters.q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  const loadStats = useCallback(() => api('/stats').then(setStats).catch(() => {}), []);
  const loadList = useCallback(async () => {
    setLoading(true); setError('');
    try {
      setList(await api('/tickets', { params: { status: filters.status, category: filters.category, priority: filters.priority, q: debouncedQ, page, limit: PAGE_SIZE } }));
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [filters.status, filters.category, filters.priority, debouncedQ, page]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadList(); }, [loadList]);

  const setFilter = (k) => (e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); if (k !== 'q') setPage(1); };
  const patchRow = (t) => setList((l) => (l ? { ...l, data: l.data.map((x) => (x.id === t.id ? { ...x, ...t } : x)) } : l));

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">Triage queue</h1>
          <button className="btn-primary" onClick={() => setShowImport(true)}>Re-import feed</button>
        </div>
        <StatsStrip stats={stats} />
        <div className="panel grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[['status', C.TICKET_STATUSES], ['category', C.CATEGORIES], ['priority', C.PRIORITIES]].map(([k, opts]) => (
            <div key={k}>
              <label className="label" htmlFor={`flt-${k}`}>{label(k)}</label>
              <select id={`flt-${k}`} className="input" value={filters[k]} onChange={setFilter(k)}>
                <option value="">All</option>
                {opts.map((o) => <option key={o} value={o}>{label(o)}</option>)}
              </select>
            </div>
          ))}
          <div>
            <label className="label" htmlFor="flt-q">Search</label>
            <input id="flt-q" className="input" placeholder="Subject or body" value={filters.q} onChange={setFilter('q')} />
          </div>
        </div>
        <ErrorBanner message={error} onRetry={loadList} />
        {loading && !list ? <Spinner label="Loading tickets…" /> : list && list.data.length === 0 ? (
          <Empty title="No tickets match these filters" hint="Clear a filter or import a feed to see tickets here." />
        ) : list && (
          <div className={loading ? 'opacity-60 transition-opacity' : ''}>
            <ul className="space-y-2">
              {list.data.map((t) => (
                <li key={t.id}>
                  <button onClick={() => setSelected(t)} className="panel block w-full text-left hover:border-signal-500">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="min-w-0 break-words font-medium">{t.subject}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge value={t.priority} /><Badge value={t.category} /><Badge value={t.status} />
                      </div>
                    </div>
                    <p className="mt-1 line-clamp-2 break-words text-sm text-ink-500">{t.body}</p>
                    <p className="mt-1 text-xs text-ink-500">
                      {t.externalId} · {fmtDateTime(t.createdAt)}{t.isReviewed ? ' · Reviewed' : ''}{t.isHumanOverride ? ' · Override' : ''}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
            <Pagination page={list.page} totalPages={list.totalPages} onPage={setPage} />
            <p className="pt-2 text-center text-xs text-ink-500">{list.total} ticket{list.total === 1 ? '' : 's'}</p>
          </div>
        )}
      </div>
      {selected && <TicketDrawer key={selected.id} ticket={selected} onChange={patchRow} onSaved={loadStats} onClose={() => setSelected(null)} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onDone={() => { loadList(); loadStats(); }} />}
    </Shell>
  );
}
