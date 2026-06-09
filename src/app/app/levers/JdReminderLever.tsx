'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Lever from './Lever';

// Lazy: preview modal only opens when an admin clicks "Preview".
// /app/levers ships the lever consoles + heavy options panels
// regardless, so trimming the preview modal out of the initial
// bundle is a small but free win.
const JdReminderModalPreview = dynamic(() => import('./JdReminderModalPreview'), { ssr: false });

// JD reminder lever — controlled visual lever wired to the cohort
// preview + pull endpoints. The Lever component is the click target;
// this wrapper owns the data fetching, draws the cohort detail panel
// below the row, and surfaces the pull-result + popup-preview as
// expandable disclosures so the console row stays the hero.

interface PendingItem {
  jd_signature_id: string;
  signer_user_id: string;
  signer_name: string | null;
  signer_email: string | null;
  jd_title: string | null;
  sent_at: string | null;
}

interface PullRecipient {
  signer_user_id: string;
  signer_name: string | null;
  signer_email: string | null;
  jd_title: string | null;
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'just now';
  const days = Math.floor(ms / 86_400_000);
  if (days >= 7) return `${Math.floor(days / 7)}w`;
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours}h`;
  const mins = Math.floor(ms / 60_000);
  if (mins >= 1) return `${mins}m`;
  return 'just now';
}

export default function JdReminderLever() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCohort, setShowCohort] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [lastResult, setLastResult] = useState<null | {
    sent: number;
    recipients: PullRecipient[];
    pulledAt: string;
  }>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/levers/jd-reminder/preview', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? `HTTP ${res.status}`);
        return;
      }
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load cohort');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pull = async () => {
    if (pulling || items.length === 0) return;
    setPulling(true);
    setError(null);
    try {
      const res = await fetch('/api/levers/jd-reminder/pull', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? `HTTP ${res.status}`);
        return;
      }
      setLastResult({
        sent: json.sent ?? 0,
        recipients: Array.isArray(json.recipients) ? json.recipients : [],
        pulledAt: new Date().toISOString(),
      });
      void refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pull failed');
    } finally {
      setPulling(false);
    }
  };

  const hint = loading
    ? 'loading…'
    : items.length === 0
      ? 'no pending JDs'
      : `${items.length} ready`;

  return (
    <div className="flex flex-col items-center">
      <Lever
        name="JD reminder"
        count={items.length}
        pulling={pulling}
        disabled={loading || items.length === 0}
        onPull={() => void pull()}
        hint={hint}
        tone="copper"
      />

      {/* Disclosure controls — placed under the lever bay so they
          don't compete with the visual on first read. */}
      <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/55">
        <button
          type="button"
          onClick={() => {
            setShowCohort((v) => !v);
            setShowPreview(false);
          }}
          className={`px-2 py-1 rounded transition-colors ${
            showCohort ? 'bg-white/10 text-white' : 'hover:text-white/85'
          }`}
        >
          Who
        </button>
        <span className="text-white/20">·</span>
        <button
          type="button"
          onClick={() => {
            setShowPreview((v) => !v);
            setShowCohort(false);
          }}
          className={`px-2 py-1 rounded transition-colors ${
            showPreview ? 'bg-white/10 text-white' : 'hover:text-white/85'
          }`}
        >
          Preview popup
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-rose-400/30 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      )}

      {/* Cohort table — collapsed by default. The visual lever stays
          the hero; admins drill in only when they need names. */}
      {showCohort && (
        <div className="mt-4 w-full max-w-2xl overflow-hidden rounded-lg border border-white/10 bg-black/30 backdrop-blur">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-[10px] uppercase tracking-wider text-white/45">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Teammate</th>
                <th className="text-left px-3 py-2 font-semibold">JD</th>
                <th className="text-right px-3 py-2 font-semibold">Pending</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-3 py-3 text-white/45 text-center text-xs">
                    Loading cohort…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-3 text-white/55 text-center text-xs">
                    Every teammate has signed their JD. Nothing to pull.
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.jd_signature_id}>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-white">{it.signer_name ?? '—'}</div>
                      <div className="text-[11px] text-white/40 truncate max-w-[260px]">{it.signer_email ?? ''}</div>
                    </td>
                    <td className="px-3 py-2.5 text-white/70">{it.jd_title ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-white/55">
                      {relativeTime(it.sent_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showPreview && (
        <div className="mt-4 w-full max-w-2xl">
          <p className="mb-2 text-[11px] text-white/55">
            Recipients see this full-screen, blocking, when the lever fires.
          </p>
          <div
            className="relative overflow-hidden rounded-xl border border-white/10 bg-neutral-900"
            style={{ aspectRatio: '16/9' }}
          >
            <div className="absolute inset-0">
              <JdReminderModalPreview previewMode />
            </div>
          </div>
        </div>
      )}

      {lastResult && (
        <div className="mt-4 w-full max-w-2xl rounded-lg border border-emerald-400/40 bg-emerald-950/40 px-4 py-3 text-emerald-100">
          <p className="text-sm font-semibold mb-1">
            ✓ Sent to {lastResult.sent} teammate{lastResult.sent === 1 ? '' : 's'}
            <span className="ml-2 font-normal text-emerald-200/65 text-xs">
              {new Date(lastResult.pulledAt).toLocaleTimeString()}
            </span>
          </p>
          <ul className="text-[12px] text-emerald-100/80 space-y-0.5">
            {lastResult.recipients.map((r) => (
              <li key={r.signer_user_id}>
                <span className="font-medium">{r.signer_name ?? r.signer_email ?? '—'}</span>
                {r.jd_title && <span className="text-emerald-200/55"> · {r.jd_title}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
