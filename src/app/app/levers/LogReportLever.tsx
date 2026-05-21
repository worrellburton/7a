'use client';

import { useCallback, useEffect, useState } from 'react';
import Lever from './Lever';

// Log Report lever — sends a 2-page email recap of the past
// 7 days of /app/outreach contact_logs to a chosen cohort of
// teammates. Visual is themed around the 🪵 log emoji used on
// the outreach grid for the same touchpoint concept.
//
// Phase 1: the visual lever lives on the console, fetches a stub
// from /api/levers/log-report/preview, and the "Send test email"
// disclosure hits /api/levers/log-report/test (also a stub).
// Phase 2+ wires real data + a Resend send; the lever's UI is
// fully reachable from this commit so each subsequent phase is
// a focused swap of one stub.

interface PreviewPayload {
  window: { startsAt: string; endsAt: string; label: string };
  counts: { total: number; uniqueContacts: number; uniqueReps: number };
  leaderboard: { userId: string; name: string; logs: number }[];
  defaultRecipients: { id: string; email: string; name: string | null }[];
  phase: number;
}

export default function LogReportLever() {
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);
  const [lastPull, setLastPull] = useState<null | { sent: number; at: string; simulated?: boolean }>(null);
  const [showTest, setShowTest] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | { ok: boolean; message: string }>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/levers/log-report/preview', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? `HTTP ${res.status}`);
        return;
      }
      setPreview(json as PreviewPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const pull = async () => {
    if (pulling) return;
    setPulling(true);
    setError(null);
    try {
      const res = await fetch('/api/levers/log-report/pull', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? `HTTP ${res.status}`);
        return;
      }
      setLastPull({ sent: json.sent ?? 0, at: new Date().toISOString(), simulated: json.simulated });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pull failed');
    } finally {
      setPulling(false);
    }
  };

  const sendTest = async () => {
    if (!testEmail.trim() || testing) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/levers/log-report/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to: testEmail.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTestResult({ ok: false, message: json?.error ?? `HTTP ${res.status}` });
        return;
      }
      const note = json?.simulated
        ? `Test queued for ${json.sentTo} (Phase ${json.phase ?? 1} stub — real send wires up in Phase 5).`
        : `Sent to ${json.sentTo}.`;
      setTestResult({ ok: true, message: note });
    } catch (e) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : 'Test failed' });
    } finally {
      setTesting(false);
    }
  };

  const total = preview?.counts.total ?? 0;
  const hint = loading
    ? 'loading…'
    : total === 0
      ? 'phase 1 · wiring'
      : `${total} log${total === 1 ? '' : 's'} this week`;

  return (
    <div className="flex flex-col items-center">
      <Lever
        // 🪵 in the name strip mirrors the same emoji the outreach
        // grid uses for 'log a touchpoint' so the visual reads as
        // 'the log emoji lever' the moment someone scans the row.
        name="🪵 Log report"
        count={total}
        pulling={pulling}
        disabled={loading}
        onPull={() => void pull()}
        hint={hint}
        tone="amber"
      />

      <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/55">
        <button
          type="button"
          onClick={() => setShowTest((v) => !v)}
          className={`px-2 py-1 rounded transition-colors ${showTest ? 'bg-white/10 text-white' : 'hover:text-white/85'}`}
        >
          Send test email
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-rose-400/30 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      )}

      {showTest && (
        <div className="mt-4 w-full max-w-md rounded-lg border border-white/10 bg-black/30 backdrop-blur px-4 py-3">
          <p className="text-[11px] text-white/55 mb-2">
            Enter an email to receive a one-off copy of this week&rsquo;s 🪵 log report — useful for previewing the inbox before the lever fires.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="someone@sevenarrowsrecovery.com"
              className="flex-1 rounded-md border border-white/10 bg-black/40 px-2.5 py-1.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
            />
            <button
              type="button"
              onClick={() => void sendTest()}
              disabled={testing || !testEmail.trim()}
              className="px-3 py-1.5 rounded-md bg-amber-400/90 hover:bg-amber-400 text-stone-900 text-[12px] font-semibold disabled:opacity-50"
            >
              {testing ? 'Sending…' : 'Send'}
            </button>
          </div>
          {testResult && (
            <p className={`mt-2 text-[11.5px] ${testResult.ok ? 'text-emerald-200' : 'text-rose-200'}`}>
              {testResult.ok ? '✓ ' : '✗ '}{testResult.message}
            </p>
          )}
        </div>
      )}

      {lastPull && (
        <div className="mt-4 w-full max-w-md rounded-lg border border-emerald-400/40 bg-emerald-950/40 px-4 py-3 text-emerald-100">
          <p className="text-sm font-semibold">
            ✓ Lever pulled
            {lastPull.simulated && <span className="ml-2 font-normal text-emerald-200/65 text-[11px]">(Phase 1 stub)</span>}
            <span className="ml-2 font-normal text-emerald-200/65 text-xs">{new Date(lastPull.at).toLocaleTimeString()}</span>
          </p>
          <p className="text-[12px] text-emerald-100/80">Sent to {lastPull.sent} teammate{lastPull.sent === 1 ? '' : 's'}.</p>
        </div>
      )}
    </div>
  );
}
