'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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

interface RecipientOption { id: string; email: string; name: string | null }
interface PreviewPayload {
  window: { startsAt: string; endsAt: string; label: string } | null;
  counts: { total: number; uniqueContacts: number; uniqueReps: number };
  leaderboard: { userId: string; name: string; logs: number }[];
  defaultRecipients: RecipientOption[];
  phase: number;
}
interface HistoryEntry {
  pulledAt: string;
  pulledBy: string | null;
  pulledByName: string | null;
  sent: number;
  failed: number;
  simulated: number;
  subject: string | null;
  total: number | null;
}

export default function LogReportLever() {
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);
  const [lastPull, setLastPull] = useState<null | { sent: number; failed?: number; at: string; simulated?: boolean }>(null);
  // Recipients picker — defaults to every super admin returned by
  // the preview endpoint. The puller can deselect names per send.
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set());
  const [showRecipients, setShowRecipients] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | { ok: boolean; message: string }>(null);
  // Preview-email popup. Lazy-loaded — the rendered HTML is a few
  // KB but we still skip the fetch until the admin asks for it.
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewMeta, setPreviewMeta] = useState<{ subject: string; from: string; replyTo: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  async function openPreview() {
    setShowPreview(true);
    if (previewHtml) return; // cached for the session
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await fetch('/api/levers/log-report/preview-html', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPreviewError(json?.error ?? `HTTP ${res.status}`);
        return;
      }
      setPreviewHtml(json.html as string);
      setPreviewMeta({ subject: json.subject as string, from: json.from as string, replyTo: json.replyTo as string });
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : 'Failed to render preview');
    } finally {
      setPreviewLoading(false);
    }
  }

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

  // Seed the recipient selection from the preview payload — every
  // default recipient starts checked. Re-running the preview
  // doesn't clobber a user's deselections.
  useEffect(() => {
    if (!preview) return;
    setSelectedRecipientIds((prev) => {
      if (prev.size > 0) return prev;
      return new Set(preview.defaultRecipients.map((r) => r.id));
    });
  }, [preview]);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/levers/log-report/history?limit=5', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (res.ok) setHistory((json.history ?? []) as HistoryEntry[]);
    } finally {
      setHistoryLoading(false);
    }
  }

  function toggleRecipient(id: string) {
    setSelectedRecipientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const pull = async () => {
    if (pulling) return;
    setPulling(true);
    setError(null);
    try {
      const recipientIds = Array.from(selectedRecipientIds);
      const res = await fetch('/api/levers/log-report/pull', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ recipientIds: recipientIds.length > 0 ? recipientIds : undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? `HTTP ${res.status}`);
        return;
      }
      setLastPull({ sent: json.sent ?? 0, failed: json.failed ?? 0, at: new Date().toISOString(), simulated: json.simulated });
      // Refresh history so the new pull lands in the disclosure.
      void loadHistory();
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

      <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/55 flex-wrap justify-center">
        <button
          type="button"
          onClick={() => void openPreview()}
          className="px-2 py-1 rounded transition-colors hover:text-white/85"
        >
          Preview email
        </button>
        <span className="text-white/20">·</span>
        <button
          type="button"
          onClick={() => setShowTest((v) => !v)}
          className={`px-2 py-1 rounded transition-colors ${showTest ? 'bg-white/10 text-white' : 'hover:text-white/85'}`}
        >
          Send test email
        </button>
        <span className="text-white/20">·</span>
        <button
          type="button"
          onClick={() => { setShowRecipients((v) => !v); setShowHistory(false); }}
          className={`px-2 py-1 rounded transition-colors ${showRecipients ? 'bg-white/10 text-white' : 'hover:text-white/85'}`}
        >
          Recipients ({selectedRecipientIds.size})
        </button>
        <span className="text-white/20">·</span>
        <button
          type="button"
          onClick={() => {
            setShowHistory((v) => {
              const next = !v;
              if (next && history == null) void loadHistory();
              return next;
            });
            setShowRecipients(false);
          }}
          className={`px-2 py-1 rounded transition-colors ${showHistory ? 'bg-white/10 text-white' : 'hover:text-white/85'}`}
        >
          History
        </button>
      </div>
      {showPreview && (
        <PreviewPopup
          html={previewHtml}
          meta={previewMeta}
          loading={previewLoading}
          error={previewError}
          onClose={() => setShowPreview(false)}
        />
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-rose-400/30 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      )}

      {showRecipients && (
        <div className="mt-4 w-full max-w-md rounded-lg border border-white/10 bg-black/30 backdrop-blur px-4 py-3">
          <p className="text-[11px] text-white/55 mb-2">
            Choose who receives the 🪵 log report when the lever fires. Defaults to every super admin.
          </p>
          {(preview?.defaultRecipients ?? []).length === 0 ? (
            <p className="text-[12px] text-white/55 italic">No eligible recipients yet — every super admin needs an email on file.</p>
          ) : (
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {(preview?.defaultRecipients ?? []).map((r) => {
                const checked = selectedRecipientIds.has(r.id);
                return (
                  <li key={r.id}>
                    <label className="flex items-center gap-2 text-[12.5px] text-white/85 cursor-pointer hover:bg-white/5 rounded px-1.5 py-1">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRecipient(r.id)}
                        className="accent-amber-400"
                      />
                      <span className="flex-1 truncate">
                        <span className="font-semibold">{r.name ?? r.email}</span>
                        {r.name && <span className="ml-1 text-white/45">· {r.email}</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {showHistory && (
        <div className="mt-4 w-full max-w-md rounded-lg border border-white/10 bg-black/30 backdrop-blur px-4 py-3">
          <p className="text-[11px] text-white/55 mb-2">
            Last five 🪵 log report sends — manual pulls + the Monday-morning cron.
          </p>
          {historyLoading ? (
            <p className="text-[12px] text-white/55 italic">Loading…</p>
          ) : !history || history.length === 0 ? (
            <p className="text-[12px] text-white/55 italic">Nothing in the activity feed yet.</p>
          ) : (
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h.pulledAt} className="text-[12px] text-white/85 leading-snug">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold">
                      {h.pulledByName ?? 'Cron'}
                    </span>
                    <span className="text-white/45 text-[11px] tabular-nums">
                      {new Date(h.pulledAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                  <div className="text-white/55 text-[11px]">
                    {h.sent > 0 && <span className="text-emerald-300">{h.sent} sent</span>}
                    {h.simulated > 0 && <span className="ml-2 text-amber-200">{h.simulated} simulated</span>}
                    {h.failed > 0 && <span className="ml-2 text-rose-300">{h.failed} failed</span>}
                    {h.total != null && <span className="ml-2 text-white/35">· recap of {h.total} touchpoint{h.total === 1 ? '' : 's'}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
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
          <p className="text-[12px] text-emerald-100/80">
            Sent to {lastPull.sent} teammate{lastPull.sent === 1 ? '' : 's'}.
            {!!lastPull.failed && lastPull.failed > 0 && (
              <span className="ml-2 text-rose-200">{lastPull.failed} failed.</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

// Email-client-style preview popup. Renders the actual HTML in an
// iframe srcDoc (style isolation; the email's table-layout +
// inline-style world doesn't leak into the admin app) wrapped in
// faux Gmail chrome — From / To / Subject lines on top, a soft
// shadow + close affordance, ESC-to-dismiss + click-outside.
function PreviewPopup({
  html,
  meta,
  loading,
  error,
  onClose,
}: {
  html: string | null;
  meta: { subject: string; from: string; replyTo: string } | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  // Lock body scroll while the popup is up so it reads as a true
  // modal, not a floating div the page scrolls behind.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const recipient = 'you@sevenarrowsrecovery.com'; // sample recipient — real send picks per-recipient
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Email preview"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-2 sm:p-6 bg-black/70 backdrop-blur-sm"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-xl overflow-hidden bg-white shadow-2xl"
      >
        {/* Browser-chrome strip — three dots + a fake address bar
            so it visually parses as 'an inbox window' on first
            scan. */}
        <div className="flex items-center gap-2 px-3 py-2 bg-stone-100 border-b border-stone-200">
          <span className="w-3 h-3 rounded-full bg-rose-400" aria-hidden="true" />
          <span className="w-3 h-3 rounded-full bg-amber-300" aria-hidden="true" />
          <span className="w-3 h-3 rounded-full bg-emerald-400" aria-hidden="true" />
          <div className="flex-1 mx-3 px-3 py-1 rounded-md bg-white border border-stone-200 text-[11px] text-stone-500 font-mono truncate">
            mail.sevenarrowsrecovery.com · inbox
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 rounded text-stone-500 hover:text-stone-900 hover:bg-stone-200 text-xs font-semibold"
            aria-label="Close preview"
          >
            ✕ Close
          </button>
        </div>

        {/* Email header — From / To / Subject / Date — same shape
            Gmail / Apple Mail render. */}
        <div className="px-5 py-3 border-b border-stone-200 bg-white">
          <p className="text-base font-semibold text-stone-900 mb-1 truncate">
            {meta?.subject ?? '🪵 Weekly Log Report'}
          </p>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-sm font-bold" aria-hidden="true">🪵</div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] text-stone-900 truncate">
                <span className="font-semibold">{meta?.from ? meta.from.replace(/<.*$/, '').trim() : 'Seven Arrows Recovery'}</span>
                <span className="text-stone-500 ml-1">
                  &lt;{meta?.from ? (meta.from.match(/<([^>]+)>/)?.[1] ?? meta.from) : 'hello@sevenarrowsrecovery.com'}&gt;
                </span>
              </p>
              <p className="text-[11.5px] text-stone-500 truncate">to {recipient}</p>
              <p className="text-[11.5px] text-stone-500">{new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
            </div>
          </div>
        </div>

        {/* Body — iframe srcDoc isolates the email's inline-style
            world. Height fills the popup; the iframe content
            scrolls inside on overflow. */}
        <div className="flex-1 bg-stone-50 overflow-hidden">
          {error ? (
            <div className="p-6 text-sm text-rose-700 bg-rose-50 m-4 rounded-lg border border-rose-200">
              {error}
            </div>
          ) : loading || !html ? (
            <div className="p-10 text-center text-stone-500">
              <p className="text-sm italic">Rendering preview…</p>
            </div>
          ) : (
            <iframe
              title="Log Report email body"
              // srcDoc keeps the iframe origin-less so cross-frame
              // styles can't leak in or out. The renderer ships a
              // full <html> doc so srcDoc is the right entry.
              srcDoc={html}
              className="w-full h-full border-0"
              sandbox="allow-same-origin"
            />
          )}
        </div>

        {/* Footer band — recapitulates the email's sender + a
            'this is a preview' badge so the popup never reads as
            'click here to send'. */}
        <div className="px-5 py-2 border-t border-stone-200 bg-stone-50 text-[11px] text-stone-500 flex items-center justify-between">
          <span>Preview of <strong>{meta?.subject ?? 'Weekly Log Report'}</strong> · not sent.</span>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-500 hover:text-stone-900 font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
