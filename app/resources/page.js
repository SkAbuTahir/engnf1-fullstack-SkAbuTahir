'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { Badge, Empty, ErrorBanner, Pagination, Spinner, label } from '@/components/ui';
import { api } from '@/lib/api';
import C from '@/lib/constants';

export default function ResourcesPage() {
  const [f, setF] = useState({ search: '', type: '', minCapacity: '' });
  const [q, setQ] = useState(f);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setQ(f); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [f]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await api('/resources', { params: { ...q, page } })); } catch (e) { setError(e.message); }
    setLoading(false);
  }, [q, page]);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  return (
    <Shell>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Resources</h1>
        <div className="panel grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div><label className="label" htmlFor="r-search">Search by name</label><input id="r-search" className="input" value={f.search} onChange={set('search')} /></div>
          <div>
            <label className="label" htmlFor="r-type">Type</label>
            <select id="r-type" className="input" value={f.type} onChange={set('type')}>
              <option value="">All types</option>
              {C.RESOURCE_TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
            </select>
          </div>
          <div><label className="label" htmlFor="r-cap">Minimum capacity</label><input id="r-cap" type="number" min="1" max="500" className="input" value={f.minCapacity} onChange={set('minCapacity')} /></div>
        </div>
        <ErrorBanner message={error} onRetry={load} />
        {loading && !data ? <Spinner label="Loading resources…" /> : data && data.data.length === 0 ? (
          <Empty title="No resources found" hint="Try a different name, type or capacity." />
        ) : data && (
          <div className={loading ? 'opacity-60' : ''}>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {data.data.map((r) => (
                <li key={r.id}>
                  <Link href={`/resources/${r.id}`} className="panel block h-full hover:border-signal-500">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="min-w-0 break-words font-medium">{r.name}</p>
                      <div className="flex gap-1.5"><Badge value={r.type} />{!r.isActive && <span className="badge bg-red-100 text-red-800">Inactive</span>}</div>
                    </div>
                    <p className="mt-1 text-sm text-ink-500">Capacity {r.capacity}</p>
                    {r.description && <p className="mt-1 line-clamp-2 break-words text-sm text-ink-700">{r.description}</p>}
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination page={data.page} totalPages={data.totalPages} onPage={setPage} />
          </div>
        )}
      </div>
    </Shell>
  );
}
