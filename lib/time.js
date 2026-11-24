// The API speaks UTC ISO strings; the UI shows the viewer's local timezone.
export const fmtDateTime = (iso) => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
export const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const pad = (n) => String(n).padStart(2, '0');
export const localDateStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// "2026-11-24" + "09:30" (local) -> UTC ISO string. "24:00" rolls over to the next local midnight.
export function localToIso(dateStr, timeStr) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi] = timeStr.split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0).toISOString();
}

export function dayRangeIso(dateStr) {
  return [localToIso(dateStr, '00:00'), localToIso(dateStr, '24:00')];
}

// 30-minute steps for pickers
export const START_TIMES = Array.from({ length: 48 }, (_, i) => `${pad(Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`);
export const END_TIMES = [...START_TIMES.slice(1), '24:00'];
