'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { dialAircall } from '@/lib/aircall-dial';
import {
  type AircallCallRow,
  directionStyle,
  formatDuration,
  formatPhone,
  formatRelativeTime,
  formatWait,
} from '../../_shared';
import { callerLocation } from '../../area-codes';

// Per-number history. Every call to/from one caller number, lined up on
// its own page, plus a name you can pin to the number (stored in
// aircall_number_labels and overlaid back on the main grid).

export default function NumberCallsContent() {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const router = useRouter();
  const params = useParams<{ number: string }>();
  const number = (params?.number || '').replace(/\D/g, '');

  const [calls, setCalls] = useState<AircallCallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pinned name for this number.
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);

  useEffect(() => {
    if (!token || !number) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/aircall/list?number=${encodeURIComponent(number)}&perPage=100`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) { setError(json.error || `HTTP ${res.status}`); setCalls([]); }
        else setCalls((json.calls ?? []) as AircallCallRow[]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, number]);

  useEffect(() => {
    if (!token || !number) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/aircall/number-label?number=${encodeURIComponent(number)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (cancelled) return;
        setSavedName(json.name ?? null);
        setName(json.name ?? '');
      } catch { /* leave blank */ }
    })();
    return () => { cancelled = true; };
  }, [token, number]);

  const saveName = useCallback(async () => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch('/api/aircall/number-label', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ number, name }),
      });
      const json = await res.json();
      if (res.ok) {
        setSavedName(json.name ?? null);
        setSavedTick(true);
        setTimeout(() => setSavedTick(false), 1500);
      }
    } finally {
      setSaving(false);
    }
  }, [token, number, name]);

  const contactName = useMemo(() => calls.find((c) => c.contact_name)?.contact_name ?? null, [calls]);
  const displayName = savedName || contactName;
  const loc = useMemo(() => callerLocation(number), [number]);

  const total = calls.length;
  const missed = calls.filter((c) => c.missed).length;
  const answered = calls.filter((c) => !c.missed && (c.duration ?? 0) > 0).length;
  const dirty = (savedName ?? '') !== name.trim();

  return (
    <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8 py-6">
      <Link
        href="/feather/calls"
        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-foreground/55 hover:text-primary uppercase tracking-wider"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        All calls
      </Link>

      <header className="mt-3 mb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-[0.22em] uppercase text-foreground/45">Caller history</p>
            <h1 className="mt-1 text-3xl font-semibold text-foreground tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
              {formatPhone(number)}
            </h1>
            <p className="mt-1 text-[13px] text-foreground/55">
              {displayName && <span className="font-semibold text-foreground/80">{displayName}</span>}
              {displayName && loc && <span className="text-foreground/30"> · </span>}
              {loc && <span>{loc.name}</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={() => dialAircall(number)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-white text-xs font-semibold uppercase tracking-wider hover:bg-primary-dark transition-colors shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.57.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.01l-2.2 2.21z" /></svg>
            Call
          </button>
        </div>

        {/* Name editor */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground/45">Name this number</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && dirty) void saveName(); }}
            placeholder="e.g. Jane from Banner Behavioral"
            maxLength={120}
            className="px-3 py-1.5 rounded-lg border border-black/10 bg-white text-[13px] w-72 max-w-full focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="button"
            onClick={() => void saveName()}
            disabled={saving || !dirty}
            className="px-3 py-1.5 rounded-lg bg-foreground text-white text-[12px] font-semibold hover:bg-foreground/85 disabled:opacity-40"
          >
            {saving ? 'Saving…' : savedTick ? '✓ Saved' : 'Save'}
          </button>
          {savedName && !dirty && (
            <button
              type="button"
              onClick={() => { setName(''); }}
              className="text-[11px] text-foreground/45 hover:text-rose-600 uppercase tracking-wider"
              title="Clear the name (Save to apply)"
            >
              Clear
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-black/10 px-3 py-1">
            <span className="font-bold tabular-nums text-foreground">{total}</span>
            <span className="text-foreground/55">{total === 1 ? 'call' : 'calls'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-black/10 px-3 py-1">
            <span className="font-bold tabular-nums text-emerald-700">{answered}</span>
            <span className="text-foreground/55">answered</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-black/10 px-3 py-1">
            <span className="font-bold tabular-nums text-rose-600">{missed}</span>
            <span className="text-foreground/55">missed</span>
          </span>
        </div>
      </header>

      {loading ? (
        <div className="h-32 rounded-2xl bg-foreground/5 animate-pulse" />
      ) : error ? (
        <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : total === 0 ? (
        <p className="rounded-xl border border-dashed border-black/15 bg-warm-bg/30 px-5 py-10 text-center text-sm text-foreground/55">
          No calls on record for this number.
        </p>
      ) : (
        <div className="rounded-2xl border border-black/10 bg-white overflow-hidden">
          <table className="w-full text-sm [&_td]:align-top">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-foreground/40 border-b border-foreground/10">
                <th className="text-left font-semibold px-5 py-3">When</th>
                <th className="text-left font-semibold px-3 py-3">Agent</th>
                <th className="text-left font-semibold px-3 py-3">Summary</th>
                <th className="text-right font-semibold px-3 py-3">Wait</th>
                <th className="text-right font-semibold px-3 py-3">Duration</th>
                <th className="text-left font-semibold px-3 py-3">Status</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5">
              {calls.map((c) => (
                <tr
                  key={c.aircall_id}
                  onClick={() => router.push(`/feather/calls/${c.aircall_id}`)}
                  className={`cursor-pointer hover:bg-warm-bg/40 transition-colors ${c.missed ? 'bg-rose-50/40' : ''}`}
                >
                  <td className="px-5 py-3 whitespace-nowrap text-foreground/70">{formatRelativeTime(c.started_at)}</td>
                  <td className="px-3 py-3 text-foreground/70">{c.user_name || <span className="text-foreground/30">—</span>}</td>
                  <td className="px-3 py-3">
                    {c.summary
                      ? <div className="max-w-[440px] whitespace-pre-line text-[12px] leading-snug text-foreground/60">{c.summary}</div>
                      : <span className="text-foreground/30">—</span>}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground/60">{formatWait(c.started_at, c.answered_at)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground/70">{formatDuration(c.duration)}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${directionStyle[c.direction ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                        {c.direction ?? 'call'}
                      </span>
                      {c.missed && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-rose-100 text-rose-700">Missed</span>}
                      {c.voicemail && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-violet-100 text-violet-700">Voicemail</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right text-foreground/30">
                    <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
