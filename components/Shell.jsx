'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRequireAuth } from './AuthProvider';
import { Spinner } from './ui';

const LINKS = [
  { href: '/tickets', label: 'Triage queue' },
  { href: '/resources', label: 'Resources' },
  { href: '/bookings', label: 'My bookings' },
  { href: '/admin', label: 'Admin', admin: true },
];

// Wrap every authenticated page: handles redirects, nav, and the initial loading state.
export default function Shell({ admin = false, children }) {
  const { user, loading, logout } = useRequireAuth({ admin });
  const path = usePathname();
  const router = useRouter();
  if (loading || !user || (admin && user.role !== 'ADMIN')) return <Spinner />;
  return (
    <div className="min-h-screen">
      <header className="bg-ink-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
          <span className="text-lg font-semibold tracking-tight">TriageSync</span>
          <nav className="order-3 flex w-full flex-wrap gap-1 sm:order-none sm:w-auto" aria-label="Main">
            {LINKS.filter((l) => !l.admin || user.role === 'ADMIN').map((l) => (
              <Link key={l.href} href={l.href}
                className={`rounded px-3 py-1.5 text-sm ${path.startsWith(l.href) ? 'bg-signal-700 text-white' : 'text-ink-300 hover:text-white'}`}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden max-w-[12rem] truncate text-ink-300 sm:inline">{user.name} ({user.role})</span>
            <button className="rounded border border-ink-500 px-2.5 py-1 hover:bg-ink-700" onClick={() => { logout(); router.replace('/login'); }}>Sign out</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>
    </div>
  );
}
