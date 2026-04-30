'use client';

import { useCallback, useEffect, useState } from 'react';
import JdReminderModalPreview from './JdReminderModalPreview';

// JD reminder lever — the first lever on the page. Three columns of
// content collapse into a vertical stack on small screens:
//
//  1. Live cohort — fetched on mount via /preview, refreshes after
//     a pull. Shows name + JD title + how stale the request is.
//  2. Preview tab — toggle to render the actual modal users will
//     see, in a contained scaled-down frame so the admin can read
//     the copy before pulling.
//  3. Pull button + result panel — POSTs to /pull, returns the
//     authoritative recipient list, then renders confirmation.

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

type Tab = 'cohort' | 'preview';

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
  const [tab, setTab] = useState<Tab>('cohort');
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      // Refresh cohort — the popup is now in their browser, but the
      // /preview endpoint is the source of truth on which JDs are
      // still pending. Same list until they actually sign, but the
      // refresh confirms the broadcast didn't side-effect.
      void refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pull failed');
    } finally {
      setPulling(false);
    }
  };

  return (
    <section className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden">
      <header className="px-6 py-5 border-b border-black/5 bg-warm-bg/30">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary mb-1">
              Lever · JD reminder
            </p>
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              Job description reminder
            </h2>
            <p className="mt-1 text-sm text-foreground/65 max-w-xl">
              Pushes a full-screen popup to every teammate with an unsigned
              job description. The popup blocks until they open and sign it.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab('cohort')}
              className={`text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-md transition-colors ${
                tab === 'cohort' ? 'bg-foreground text-white' : 'bg-white border border-black/10 text-foreground/65 hover:text-foreground'
              }`}
            >
              Live cohort {loading ? '' : `· ${items.length}`}
            </button>
            <button
              type="button"
              onClick={() => setTab('preview')}
              className={`text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-md transition-colors ${
                tab === 'preview' ? 'bg-foreground text-white' : 'bg-white border border-black/10 text-foreground/65 hover:text-foreground'
              }`}
            >
              Preview popup
            </button>
          </div>
        </div>
      </header>

      <div className="px-6 py-5">
        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {error}
          </div>
        )}

        {tab === 'cohort' && (
          <CohortPanel items={items} loading={loading} />
        )}
        {tab === 'preview' && (
          <PreviewPanel />
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-black/5 pt-4">
          <p className="text-xs text-foreground/55">
            Pulling sends the popup right now to{' '}
            <span className="font-semibold text-foreground">
              {items.length} teammate{items.length === 1 ? '' : 's'}
            </span>
            . Activity log records who pulled and who received.
          </p>
          <button
            type="button"
            onClick={() => void pull()}
            disabled={pulling || items.length === 0 || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {pulling ? 'Pulling…' : items.length === 0 ? 'No pending JDs' : `Pull lever (×${items.length})`}
          </button>
        </div>
      </div>

      {lastResult && <PullResultPanel result={lastResult} />}
    </section>
  );
}

function CohortPanel({ items, loading }: { items: PendingItem[]; loading: boolean }) {
  if (loading) {
    return <p className="text-sm text-foreground/45">Loading cohort…</p>;
  }
  if (items.length === 0) {
    return (
      <p className="text-sm text-foreground/55">
        No pending signatures right now — every teammate has signed their JD.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-black/5">
      <table className="w-full text-sm">
        <thead className="bg-warm-bg/40 text-[10px] uppercase tracking-wider text-foreground/55">
          <tr>
            <th className="text-left px-3 py-2 font-semibold">Teammate</th>
            <th className="text-left px-3 py-2 font-semibold">Job description</th>
            <th className="text-right px-3 py-2 font-semibold">Pending</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {items.map((it) => (
            <tr key={it.jd_signature_id}>
              <td className="px-3 py-2.5">
                <div className="font-medium text-foreground">{it.signer_name ?? '—'}</div>
                <div className="text-[11px] text-foreground/45 truncate max-w-[260px]">{it.signer_email ?? ''}</div>
              </td>
              <td className="px-3 py-2.5 text-foreground/75">{it.jd_title ?? '—'}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-foreground/65">
                {relativeTime(it.sent_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PreviewPanel() {
  return (
    <div>
      <p className="mb-3 text-xs text-foreground/55">
        This is exactly what the recipient sees — full-screen, blocking,
        with a single CTA to open + sign.
      </p>
      <div className="relative overflow-hidden rounded-xl border border-black/10 bg-neutral-900" style={{ aspectRatio: '16/9' }}>
        <div className="absolute inset-0">
          <JdReminderModalPreview previewMode />
        </div>
      </div>
    </div>
  );
}

function PullResultPanel({ result }: { result: { sent: number; recipients: PullRecipient[]; pulledAt: string } }) {
  return (
    <footer className="border-t border-emerald-200 bg-emerald-50/70 px-6 py-4">
      <p className="text-sm font-semibold text-emerald-900 mb-2">
        ✓ Sent to {result.sent} teammate{result.sent === 1 ? '' : 's'} ·{' '}
        <span className="font-normal text-emerald-800/80">
          {new Date(result.pulledAt).toLocaleTimeString()}
        </span>
      </p>
      <ul className="text-[12px] text-emerald-900/85 space-y-0.5">
        {result.recipients.map((r) => (
          <li key={r.signer_user_id} className="flex items-center justify-between gap-3">
            <span className="truncate">
              <span className="font-medium">{r.signer_name ?? r.signer_email ?? '—'}</span>
              {r.jd_title && <span className="text-emerald-800/65"> · {r.jd_title}</span>}
            </span>
          </li>
        ))}
      </ul>
    </footer>
  );
}
