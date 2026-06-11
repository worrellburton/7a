'use client';

// /auth/reset — where the "Forgot password?" email link lands.
//
// The reset email's redirect goes through /auth/callback (which
// exchanges the one-time code for a session) and on to here, so by
// the time this page renders the visitor has a live recovery session
// and just needs to choose a new password via auth.updateUser.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [ready, setReady] = useState<'checking' | 'ok' | 'no-session'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setReady(data.session ? 'ok' : 'no-session');
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (password.length < 6) {
      setError('Pick a password of at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Those passwords don’t match.');
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDone(true);
    setTimeout(() => { window.location.href = '/feather'; }, 1200);
  }

  const inputClass =
    'w-full rounded-2xl border border-black/15 bg-white px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors';

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#f5ede2] via-[#f3e2d2] to-[#ecd3bd]"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <div className="w-full max-w-sm rounded-[28px] border border-white/70 bg-white/70 backdrop-blur-xl shadow-[0_8px_48px_rgba(120,72,40,0.18)] p-7">
        <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Choose a new password
        </h1>

        {ready === 'checking' ? (
          <p className="mt-4 text-sm text-foreground/55">Checking your reset link…</p>
        ) : ready === 'no-session' ? (
          <div className="mt-4 text-sm text-foreground/70 leading-relaxed">
            <p>This reset link is invalid or has expired.</p>
            <a href="/feather" className="mt-3 inline-block text-primary font-semibold hover:underline underline-offset-4">
              Back to sign in →
            </a>
          </div>
        ) : done ? (
          <p className="mt-4 text-sm text-emerald-700 font-medium">
            Password updated — taking you in…
          </p>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3">
            <input
              type="password"
              autoComplete="new-password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Repeat it"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
            />
            {error && <p className="text-[12.5px] text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-2xl bg-primary hover:bg-primary-dark text-white text-sm font-bold py-3 transition-colors disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Save password'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
