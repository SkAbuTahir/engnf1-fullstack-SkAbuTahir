'use client';
import { useEffect } from 'react';

export function Spinner({ label = 'Loading…' }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 p-10 text-ink-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-ink-300 border-t-signal-600" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorBanner({ message, onRetry, onDismiss }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start justify-between gap-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
      <span className="min-w-0 break-words">{message}</span>
      <span className="flex shrink-0 gap-3">
        {onRetry && <button className="font-medium underline" onClick={onRetry}>Retry</button>}
        {onDismiss && <button className="font-medium underline" onClick={onDismiss}>Dismiss</button>}
      </span>
    </div>
  );
}

export function Empty({ title, hint }) {
  return (
    <div className="rounded-lg border border-dashed border-ink-300 bg-white p-8 text-center">
      <p className="font-medium text-ink-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink-500">{hint}</p>}
    </div>
  );
}

export function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 pt-3 text-sm">
      <button className="btn-secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span className="text-ink-500">Page {page} of {totalPages}</span>
      <button className="btn-secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  );
}

const TONES = {
  BILLING: 'bg-amber-100 text-amber-900', BUG: 'bg-red-100 text-red-800', FEATURE_REQUEST: 'bg-violet-100 text-violet-800',
  LOGIN: 'bg-sky-100 text-sky-800', DELIVERY: 'bg-emerald-100 text-emerald-800',
  LOW: 'bg-ink-100 text-ink-700', MEDIUM: 'bg-blue-100 text-blue-800', HIGH: 'bg-orange-100 text-orange-800', URGENT: 'bg-red-600 text-white',
  OPEN: 'bg-signal-100 text-signal-700', IN_PROGRESS: 'bg-yellow-100 text-yellow-900', RESOLVED: 'bg-emerald-100 text-emerald-800', CLOSED: 'bg-ink-100 text-ink-500',
  PENDING: 'bg-yellow-100 text-yellow-900', APPROVED: 'bg-emerald-100 text-emerald-800', REJECTED: 'bg-red-100 text-red-800', CANCELLED: 'bg-ink-100 text-ink-500',
  ROOM: 'bg-sky-100 text-sky-800', LAB: 'bg-violet-100 text-violet-800', EQUIPMENT: 'bg-amber-100 text-amber-900',
};
export const label = (v) => String(v).replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
export function Badge({ value }) {
  return <span className={`badge ${TONES[value] || 'bg-ink-100 text-ink-700'}`}>{label(value)}</span>;
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-white p-5 shadow-xl sm:rounded-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button aria-label="Close" className="text-ink-500 hover:text-ink-900" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
