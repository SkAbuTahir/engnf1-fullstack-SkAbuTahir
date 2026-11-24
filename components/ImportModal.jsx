'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { ErrorBanner, Modal } from './ui';

// A small demo "feed": re-importing the same externalIds is idempotent and keeps human overrides.
const FEED = [
  { externalId: 'TKT-1001', subject: 'Refund not received for order #4521', body: 'I requested a refund two weeks ago and it has not arrived yet.' },
  { externalId: 'TKT-1014', subject: 'Login page error after credentials', body: 'The login page shows a 500 exception after I enter my credentials.' },
  { externalId: 'FEED-2001', subject: 'Invoice PDF will not download', body: 'The invoice download link returns an error page.' },
  { externalId: 'FEED-2002', subject: 'Parcel stuck in transit', body: 'My package has not arrived and tracking has not moved in 5 days.' },
  { externalId: 'FEED-2003', subject: 'Please add keyboard shortcuts', body: 'Keyboard shortcuts for changing ticket status would speed things up.' },
];

export default function ImportModal({ onClose, onDone }) {
  const [text, setText] = useState(JSON.stringify(FEED, null, 2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function run() {
    setError(''); setResult(null);
    let tickets;
    try { tickets = JSON.parse(text); } catch { setError('That is not valid JSON. Paste an array of { externalId, subject, body }.'); return; }
    setBusy(true);
    try {
      const r = await api('/tickets/import', { method: 'POST', body: { tickets } });
      setResult(r);
      onDone();
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  return (
    <Modal title="Re-import feed" onClose={onClose}>
      <p className="mb-2 text-sm text-ink-500">Paste a JSON array of tickets. Existing ticket ids are updated, never duplicated, and agent category changes are preserved.</p>
      <textarea aria-label="Feed JSON" className="input h-56 font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="mt-3 space-y-3">
        <ErrorBanner message={error} />
        {result && (
          <p role="status" className="rounded-md bg-emerald-50 p-2 text-sm text-emerald-900">
            Imported {result.importedCount} new, updated {result.updatedCount}, kept {result.skippedOverrideCount} human overrides ({result.total} total).
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Close</button>
          <button className="btn-primary" onClick={run} disabled={busy}>{busy ? 'Importing…' : 'Import feed'}</button>
        </div>
      </div>
    </Modal>
  );
}
