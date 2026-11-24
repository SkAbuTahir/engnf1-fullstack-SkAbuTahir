'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { api } from '@/lib/api';
import { ErrorBanner, Spinner } from './ui';

// Client-side checks mirror the server rules (the server stays the source of truth).
function validate(mode, f) {
  const e = {};
  if (mode === 'register' && (f.name.trim().length < 2 || f.name.trim().length > 50)) e.name = 'Name must be 2–50 characters';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()) || f.email.length > 254) e.email = 'Enter a valid email address';
  if (mode === 'register') {
    if (f.password.length < 8 || f.password.length > 64) e.password = 'Password must be 8–64 characters';
    else if (!/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) e.password = 'Password needs at least one letter and one digit';
  } else if (!f.password) e.password = 'Enter your password';
  return e;
}

export default function AuthForm({ mode }) {
  const isReg = mode === 'register';
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && user) router.replace('/tickets'); }, [loading, user, router]);
  if (loading || user) return <Spinner />;

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  async function submit(e) {
    e.preventDefault();
    const v = validate(mode, f);
    setErrors(v);
    setFormError('');
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      if (isReg) await api('/auth/register', { method: 'POST', body: { name: f.name.trim(), email: f.email.trim(), password: f.password } });
      await login(f.email.trim(), f.password);
      router.replace('/tickets');
    } catch (err) {
      setFormError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <form onSubmit={submit} noValidate className="panel w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">TriageSync</h1>
          <p className="text-sm text-ink-500">{isReg ? 'Create an agent account' : 'Sign in to the triage queue'}</p>
        </div>
        <ErrorBanner message={formError} />
        {isReg && (
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" className="input" value={f.name} onChange={set('name')} autoComplete="name" />
            {errors.name && <p className="mt-1 text-xs text-red-700">{errors.name}</p>}
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" value={f.email} onChange={set('email')} autoComplete="email" />
          {errors.email && <p className="mt-1 text-xs text-red-700">{errors.email}</p>}
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" className="input" value={f.password} onChange={set('password')} autoComplete={isReg ? 'new-password' : 'current-password'} />
          {errors.password && <p className="mt-1 text-xs text-red-700">{errors.password}</p>}
        </div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : isReg ? 'Create account' : 'Sign in'}</button>
        <p className="text-center text-sm text-ink-500">
          {isReg ? <>Already have an account? <Link className="text-signal-700 underline" href="/login">Sign in</Link></> : <>New here? <Link className="text-signal-700 underline" href="/register">Create an account</Link></>}
        </p>
      </form>
    </div>
  );
}
