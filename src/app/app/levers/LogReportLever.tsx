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

interface RecipientOption { id: string; email: string; name: string | null; isSuperAdmin?: boolean; isAdmin?: boolean }
interface ScheduleRow { enabled: boolean; day_of_week: number; hour_utc: number; display_timezone: string; updated_at: string | null }
interface PreviewPayload {
  window: { startsAt: string; endsAt: string; label: string } | null;
  counts: { total: number; uniqueContacts: number; uniqueReps: number };
  leaderboard: { userId: string; name: string; logs: number }[];
  defaultRecipients: RecipientOption[];
  phase: number;
}
interface PullRecipientResult { id: string; name: string | null; email: string; ok: boolean; error?: string }
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
  // Per-recipient send result is kept so the popup can surface
  // which teammates failed (not just "3 failed.") and offer a
  // one-click retry that re-pulls only the failed IDs.
  const [lastPull, setLastPull] = useState<null | {
    sent: number;
    failed?: number;
    at: string;
    simulated?: boolean;
    recipients?: PullRecipientResult[];
  }>(null);
  const [showFailures, setShowFailures] = useState(false);
  const [retrying, setRetrying] = useState(false);
  // Recipients picker — defaults to every super admin returned by
  // the preview endpoint, OR to the persisted recipient list saved
  // on lever_schedules.recipient_user_ids when one exists. The
  // puller can deselect names per send, and hitting "Save
  // recipients" writes the current selection back so both the
  // manual pull and the auto-fire cron pick it up.
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set());
  const [savedRecipientIds, setSavedRecipientIds] = useState<Set<string> | null>(null);
  const [savingRecipients, setSavingRecipients] = useState(false);
  const [recipientsSavedAt, setRecipientsSavedAt] = useState<number | null>(null);
  const [showRecipients, setShowRecipients] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  // Schedule modal — Set Automation button opens it. Persists to
  // public.lever_schedules; the hourly cron at
  // /api/cron/levers/log-report reads the row and fires only on
  // matching UTC day + hour.
  const [showSchedule, setShowSchedule] = useState(false);
  // Persisted schedule — drives the "Auto: Fri 2am Phoenix" status
  // strip under the lever so admins can see at a glance whether the
  // automation is active without opening the modal.
  const [schedule, setSchedule] = useState<ScheduleRow | null>(null);
  const loadSchedule = useCallback(async () => {
    try {
      const res = await fetch('/api/levers/log-report/schedule', { cache: 'no-store' });
      if (!res.ok) return;
      const j = (await res.json().catch(() => ({}))) as { schedule: ScheduleRow | null };
      setSchedule(j?.schedule ?? null);
    } catch { /* non-fatal */ }
  }, []);
  useEffect(() => { void loadSchedule(); }, [loadSchedule]);

  // Load the persisted recipient list once. Drives the seed below
  // (so the picker opens to the saved cohort, not "all super
  // admins") and powers the dirty-state indicator on the Save
  // button so the admin can tell whether their current selection
  // differs from what's on disk.
  const loadSavedRecipients = useCallback(async () => {
    try {
      const res = await fetch('/api/levers/log-report/recipients', { cache: 'no-store' });
      if (!res.ok) { setSavedRecipientIds(new Set()); return; }
      const j = (await res.json().catch(() => ({}))) as { recipientUserIds?: string[] };
      setSavedRecipientIds(new Set(Array.isArray(j.recipientUserIds) ? j.recipientUserIds : []));
    } catch {
      setSavedRecipientIds(new Set());
    }
  }, []);
  useEffect(() => { void loadSavedRecipients(); }, [loadSavedRecipients]);
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

  // Seed the recipient selection — saved cohort wins. If the
  // admin has previously saved a recipient list, open the picker
  // to exactly that list (so re-opening Recipients shows the
  // chosen people pre-checked). When no list has been saved yet,
  // fall back to "every super admin" — preserves the original
  // one-click behaviour for a fresh install. Once the user has
  // edited the in-memory selection (size > 0) we don't clobber it
  // on subsequent preview refreshes.
  useEffect(() => {
    if (!preview || savedRecipientIds === null) return;
    setSelectedRecipientIds((prev) => {
      if (prev.size > 0) return prev;
      if (savedRecipientIds.size > 0) return new Set(savedRecipientIds);
      return new Set(
        preview.defaultRecipients
          .filter((r) => r.isSuperAdmin === true)
          .map((r) => r.id),
      );
    });
  }, [preview, savedRecipientIds]);

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

  // Persist the current selection so the auto-fire cron and the
  // next manual pull both use it. Empty selection clears the
  // saved list (the cron then falls back to "all super admins"
  // again). The "Saved" badge timestamp drives the green flash
  // under the Save button.
  async function saveRecipients() {
    if (savingRecipients) return;
    setSavingRecipients(true);
    try {
      const ids = Array.from(selectedRecipientIds);
      const res = await fetch('/api/levers/log-report/recipients', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ recipientUserIds: ids }),
      });
      const j = (await res.json().catch(() => ({}))) as { recipientUserIds?: string[]; error?: string };
      if (!res.ok) {
        setError(j.error ?? `HTTP ${res.status}`);
        return;
      }
      setSavedRecipientIds(new Set(Array.isArray(j.recipientUserIds) ? j.recipientUserIds : ids));
      setRecipientsSavedAt(Date.now());
      // Clear the "just saved" flash after a couple seconds so the
      // button doesn't sit perma-green and stop conveying state.
      window.setTimeout(() => { setRecipientsSavedAt(null); }, 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save recipients');
    } finally {
      setSavingRecipients(false);
    }
  }

  // Dirty if the current in-memory selection differs from what's
  // on disk. Used to enable the Save button only when there's
  // actually something new to write.
  const isRecipientsDirty = (() => {
    if (!savedRecipientIds) return false;
    if (savedRecipientIds.size !== selectedRecipientIds.size) return true;
    for (const id of selectedRecipientIds) if (!savedRecipientIds.has(id)) return true;
    return false;
  })();

  // Shared send helper — used by the primary "pull lever" action
  // *and* the "Retry failed" button on the result popup. Targeting
  // an explicit list of ids re-tries only those recipients, so a
  // partially-failed send can be patched without spamming the
  // teammates who already got the email.
  const runPull = async (recipientIds: string[] | null, mode: 'pull' | 'retry') => {
    setError(null);
    try {
      const res = await fetch('/api/levers/log-report/pull', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ recipientIds: recipientIds && recipientIds.length > 0 ? recipientIds : undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? `HTTP ${res.status}`);
        return;
      }
      const recipients = Array.isArray(json.recipients) ? (json.recipients as PullRecipientResult[]) : [];
      if (mode === 'retry' && lastPull) {
        // Merge the retry result back into the last pull so the
        // popup updates in place — successes get promoted, the
        // failed list shrinks.
        const byId = new Map(recipients.map((r) => [r.id, r]));
        const merged = (lastPull.recipients ?? []).map((r) => byId.get(r.id) ?? r);
        const sent = merged.filter((r) => r.ok).length;
        const failed = merged.filter((r) => !r.ok).length;
        setLastPull({
          sent,
          failed,
          at: new Date().toISOString(),
          simulated: json.simulated,
          recipients: merged,
        });
        setShowFailures(failed > 0);
      } else {
        setLastPull({
          sent: json.sent ?? 0,
          failed: json.failed ?? 0,
          at: new Date().toISOString(),
          simulated: json.simulated,
          recipients,
        });
        setShowFailures(false);
      }
      void loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : `${mode === 'retry' ? 'Retry' : 'Pull'} failed`);
    }
  };

  const pull = async () => {
    if (pulling || retrying) return;
    setPulling(true);
    try {
      await runPull(Array.from(selectedRecipientIds), 'pull');
    } finally {
      setPulling(false);
    }
  };

  const retryFailed = async () => {
    if (pulling || retrying) return;
    const failedIds = (lastPull?.recipients ?? []).filter((r) => !r.ok).map((r) => r.id);
    if (failedIds.length === 0) return;
    setRetrying(true);
    try {
      await runPull(failedIds, 'retry');
    } finally {
      setRetrying(false);
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
        <span className="text-white/20">·</span>
        <button
          type="button"
          onClick={() => setShowSchedule(true)}
          className="px-2 py-1 rounded transition-colors hover:text-white/85"
        >
          {schedule?.enabled ? 'Edit automation' : 'Set automation'}
        </button>
      </div>

      {/* Automation status strip — reads the persisted lever_schedules
          row so the lever screen tells you at a glance whether the
          weekly auto-fire is on, and at what local day/time. Clicking
          opens the same modal as the "Set automation" link. */}
      <button
        type="button"
        onClick={() => setShowSchedule(true)}
        className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] transition-colors ${
          schedule?.enabled
            ? 'border-emerald-400/40 bg-emerald-950/40 text-emerald-100 hover:bg-emerald-900/40'
            : 'border-white/15 bg-white/5 text-white/55 hover:text-white/85'
        }`}
        aria-label="Automation status"
      >
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${schedule?.enabled ? 'bg-emerald-400' : 'bg-white/30'}`} aria-hidden="true" />
        {schedule?.enabled
          ? `Auto · ${describeSchedule(schedule)}`
          : schedule
            ? 'Automation paused'
            : 'Automation off'}
      </button>
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
          <div className="flex items-baseline justify-between mb-2 gap-2">
            <p className="text-[11px] text-white/55">
              Choose who receives the 🪵 log report. Super admins are checked by default; every active teammate is selectable.
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedRecipientIds(new Set((preview?.defaultRecipients ?? []).map((r) => r.id)))}
                className="text-[10px] uppercase tracking-wider text-white/55 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10"
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedRecipientIds(new Set())}
                className="text-[10px] uppercase tracking-wider text-white/55 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10"
              >
                None
              </button>
            </div>
          </div>
          {(preview?.defaultRecipients ?? []).length === 0 ? (
            <p className="text-[12px] text-white/55 italic">No eligible recipients yet — every staff member needs an email on file.</p>
          ) : (
            <>
              <ul className="space-y-1 max-h-64 overflow-y-auto">
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
                        <span className="flex-1 truncate min-w-0">
                          <span className="font-semibold">{r.name ?? r.email}</span>
                          {r.name && <span className="ml-1 text-white/45">· {r.email}</span>}
                        </span>
                        {r.isSuperAdmin && (
                          <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-200 border border-violet-500/40">SA</span>
                        )}
                        {!r.isSuperAdmin && r.isAdmin && (
                          <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-200 border border-sky-500/40">Admin</span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>

              {/* Save bar — pins the persistence affordance to the
                  bottom of the picker so the admin sees that
                  "Recipients" is a saveable cohort, not a per-send
                  override. The cron + manual pull both read this
                  list, so saving here propagates everywhere. */}
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                <p className="text-[10.5px] text-white/45 leading-tight">
                  Saved recipients receive the auto-fire cron <em>and</em> the next manual pull.
                </p>
                <button
                  type="button"
                  onClick={() => void saveRecipients()}
                  disabled={savingRecipients || (!isRecipientsDirty && recipientsSavedAt === null)}
                  className={`shrink-0 px-3 py-1.5 rounded text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                    recipientsSavedAt
                      ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40'
                      : isRecipientsDirty
                        ? 'bg-amber-400/90 text-black hover:bg-amber-300'
                        : 'bg-white/10 text-white/45 border border-white/10 cursor-not-allowed'
                  }`}
                  title={
                    recipientsSavedAt
                      ? 'Saved — the cron and the next pull will use this list.'
                      : isRecipientsDirty
                        ? 'Persist this cohort to the auto-fire cron + the next manual pull.'
                        : 'No changes to save.'
                  }
                >
                  {savingRecipients
                    ? 'Saving…'
                    : recipientsSavedAt
                      ? '✓ Saved'
                      : isRecipientsDirty
                        ? `Save (${selectedRecipientIds.size})`
                        : 'Saved'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {showSchedule && (
        <ScheduleModal
          onClose={() => setShowSchedule(false)}
          onSaved={() => { void loadSchedule(); }}
        />
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

      {lastPull && (() => {
        const hasFailures = !!lastPull.failed && lastPull.failed > 0;
        // Frame the whole card amber when any send failed so the
        // popup doesn't read as a clean success on first scan.
        const tone = hasFailures
          ? 'border-amber-400/40 bg-amber-950/40 text-amber-100'
          : 'border-emerald-400/40 bg-emerald-950/40 text-emerald-100';
        const failedRecipients = (lastPull.recipients ?? []).filter((r) => !r.ok);
        return (
          <div className={`mt-4 w-full max-w-md rounded-lg border ${tone} px-4 py-3`}>
            <p className="text-sm font-semibold">
              {hasFailures ? '⚠ Partial send' : '✓ Lever pulled'}
              {lastPull.simulated && <span className="ml-2 font-normal text-emerald-200/65 text-[11px]">(Phase 1 stub)</span>}
              <span className="ml-2 font-normal text-white/55 text-xs">{new Date(lastPull.at).toLocaleTimeString()}</span>
            </p>
            <p className="text-[12px] text-white/85">
              <span className="text-emerald-200">Sent to {lastPull.sent} teammate{lastPull.sent === 1 ? '' : 's'}.</span>
              {hasFailures && (
                <span className="ml-2 text-rose-200">{lastPull.failed} failed.</span>
              )}
            </p>
            {hasFailures && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowFailures((v) => !v)}
                  className="text-[11px] uppercase tracking-wider text-white/65 hover:text-white px-2 py-1 rounded hover:bg-white/10"
                >
                  {showFailures ? 'Hide details' : 'Show details'}
                </button>
                <button
                  type="button"
                  onClick={() => void retryFailed()}
                  disabled={retrying || pulling}
                  className="text-[11px] uppercase tracking-wider px-2 py-1 rounded bg-rose-500/20 text-rose-100 hover:bg-rose-500/30 border border-rose-400/40 disabled:opacity-50"
                >
                  {retrying ? 'Retrying…' : `Retry ${failedRecipients.length} failed`}
                </button>
              </div>
            )}
            {hasFailures && showFailures && failedRecipients.length > 0 && (
              <ul className="mt-2 space-y-1.5 max-h-48 overflow-y-auto rounded-md border border-rose-400/25 bg-black/30 p-2">
                {failedRecipients.map((r) => (
                  <li key={r.id} className="text-[11.5px] leading-snug">
                    <div className="text-rose-100 font-semibold truncate">
                      {r.name ?? r.email}
                      {r.name && <span className="ml-1 text-rose-200/65 font-normal">· {r.email}</span>}
                    </div>
                    {r.error && (
                      <div className="text-rose-200/85 font-mono text-[10.5px] break-all leading-snug">
                        {r.error.length > 280 ? `${r.error.slice(0, 280)}…` : r.error}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })()}
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
        // h-[80vh] gives the column 80% of the viewport vertically
        // so the email's actual body (the KPI band, leaderboard,
        // and page-2 sections) reads at a glance — h-[92vh] was
        // tight against the lever console on shorter laptop
        // screens, and the iframe was scrolling internally for any
        // content past the eyebrow + 🪵. min-h-[600px] floors the
        // popup so it stays readable on a narrow / short window.
        className="relative w-full max-w-4xl h-[80vh] min-h-[600px] flex flex-col rounded-xl overflow-hidden bg-white shadow-2xl"
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
            world. flex-1 + min-h-0 makes the iframe stretch to fill
            whatever space the chrome + header + footer haven't
            claimed; the iframe scrolls inside on overflow so the
            full 2-page email is reachable without resizing the
            popup. */}
        <div className="flex-1 min-h-0 bg-stone-50 overflow-hidden flex">
          {error ? (
            <div className="p-6 text-sm text-rose-700 bg-rose-50 m-4 rounded-lg border border-rose-200">
              {error}
            </div>
          ) : loading || !html ? (
            <div className="p-10 text-center text-stone-500 w-full">
              <p className="text-sm italic">Rendering preview…</p>
            </div>
          ) : (
            <iframe
              title="Log Report email body"
              // srcDoc keeps the iframe origin-less so cross-frame
              // styles can't leak in or out. The renderer ships a
              // full <html> doc so srcDoc is the right entry.
              srcDoc={html}
              // h-full + flex-1 wrapper above means the iframe
              // takes the column's remaining height. The renderer
              // wraps the email card in a 100%-width outer table
              // with padding so the body still reads as 'an email
              // floating in a Sand background' on wider popups.
              className="flex-1 w-full h-full border-0"
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

// ─── Schedule modal ────────────────────────────────────────────
// Set Automation button on the lever opens this. Reads + writes
// /api/levers/log-report/schedule. Picker shows day-of-week + time
// in the user's local timezone; we convert to UTC for storage so
// the cron's match query is timezone-stable. Single on/off switch
// at the top toggles enabled.

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface ScheduleApi {
  schedule: ScheduleRow | null;
}

function ScheduleModal({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // Local fields — initialised from the persisted schedule, then
  // edited freely. Day + hour are in *local* time for the picker
  // and converted to UTC server-side via the helper below.
  const [enabled, setEnabled] = useState(true);
  const [dayLocal, setDayLocal] = useState(1); // Monday
  const [hourLocal, setHourLocal] = useState(18); // 6pm
  const [tz, setTz] = useState('America/Phoenix');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/levers/log-report/schedule', { cache: 'no-store' })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((j: ScheduleApi | null) => {
        if (cancelled || !j?.schedule) {
          // Surface the browser's IANA tz to the picker by default
          // when no schedule has been saved yet.
          try {
            setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Phoenix');
          } catch { /* ignore */ }
          setLoading(false);
          return;
        }
        const s = j.schedule;
        setEnabled(s.enabled !== false);
        setTz(s.display_timezone || 'America/Phoenix');
        // Convert the stored UTC day/hour back into the
        // display_timezone so the picker shows what the user
        // actually picked (not the underlying UTC).
        const { day: localDay, hour: localHour } = utcToLocal(s.day_of_week, s.hour_utc, s.display_timezone);
        setDayLocal(localDay);
        setHourLocal(localHour);
      })
      .catch(() => { /* fall through to defaults */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Lock body scroll + ESC-to-close.
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

  async function save() {
    setSaving(true);
    setError(null);
    // Guard against a malformed IANA tz before we hit the server —
    // Intl.DateTimeFormat throws on an unknown tz, and our
    // localToUtc helper silently falls back to treating inputs as
    // UTC, which would save the wrong wall-clock time.
    const tzTrimmed = tz.trim();
    if (!tzTrimmed) {
      setError('Timezone is required.');
      setSaving(false);
      return;
    }
    try {
      const probe = new Intl.DateTimeFormat('en-US', { timeZone: tzTrimmed });
      void probe.format(new Date());
    } catch {
      setError(`"${tzTrimmed}" isn't a recognised IANA timezone (e.g. America/Phoenix, America/New_York).`);
      setSaving(false);
      return;
    }
    try {
      const { day: dayUtc, hour: hourUtc } = localToUtc(dayLocal, hourLocal, tzTrimmed);
      const res = await fetch('/api/levers/log-report/schedule', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enabled, dayOfWeek: dayUtc, hourUtc, displayTimezone: tzTrimmed }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((j as { error?: string }).error ?? `HTTP ${res.status}`);
        return;
      }
      setSaved(true);
      onSaved?.();
      // Keep the modal up just long enough for the green "Saved ✓"
      // line to land — silent auto-close was reading as "did it
      // even save?" in QA.
      setTimeout(() => { onClose(); }, 700);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Set automation"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden"
      >
        <header className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span aria-hidden="true">🪵</span>
            <h2 className="text-base font-semibold text-stone-900">Set automation</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-500 hover:text-stone-900 text-xs font-semibold px-2 py-1 rounded hover:bg-stone-100"
            aria-label="Close"
          >
            ✕
          </button>
        </header>
        <div className="px-5 py-4 space-y-4">
          {loading ? (
            <p className="text-sm italic text-stone-500">Loading current schedule…</p>
          ) : (
            <>
              {/* Active / Inactive switch — the on/off toggle the
                  user asked for. Reads as 'is the automation
                  actually running?' which is more useful than
                  Enabled / Disabled wording. */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-stone-200 bg-stone-50">
                <div>
                  <p className="text-sm font-semibold text-stone-900">{enabled ? 'Active' : 'Inactive'}</p>
                  <p className="text-[11.5px] text-stone-500">
                    {enabled
                      ? 'Auto-fires every week on the day + time below.'
                      : 'Paused. Manual lever pulls still work.'}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => setEnabled((v) => !v)}
                  className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-stone-300'}`}
                >
                  <span className="sr-only">{enabled ? 'Active' : 'Inactive'}</span>
                  <span className={`absolute top-0.5 inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div className={`space-y-3 ${enabled ? '' : 'opacity-50 pointer-events-none'}`}>
                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Day of week</span>
                  <select
                    value={dayLocal}
                    onChange={(e) => setDayLocal(Number(e.target.value))}
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm bg-white"
                  >
                    {DAY_LABELS.map((label, i) => (
                      <option key={i} value={i}>{label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Time of day</span>
                  <select
                    value={hourLocal}
                    onChange={(e) => setHourLocal(Number(e.target.value))}
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm bg-white"
                  >
                    {Array.from({ length: 24 }).map((_, h) => (
                      <option key={h} value={h}>
                        {fmtHour(h)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Timezone</span>
                  <input
                    type="text"
                    value={tz}
                    onChange={(e) => setTz(e.target.value)}
                    placeholder="America/Phoenix"
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm bg-white font-mono"
                  />
                  <p className="mt-1 text-[10.5px] text-stone-500">
                    IANA tz database name. Phoenix doesn&apos;t observe DST so once-saved schedules stay stable; other zones may drift twice a year and need a re-save.
                  </p>
                </label>
              </div>

              {error && (
                <p className="text-[12.5px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1.5">{error}</p>
              )}
              {saved && !error && (
                <p className="text-[12.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1.5">
                  ✓ Schedule saved.
                </p>
              )}
            </>
          )}
        </div>
        <footer className="px-5 py-3 border-t border-stone-200 bg-stone-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-3 py-1.5 rounded-md text-stone-600 hover:text-stone-900 text-sm font-semibold disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={loading || saving || saved}
            className="px-4 py-1.5 rounded-md bg-amber-400 hover:bg-amber-500 text-stone-900 text-sm font-semibold disabled:opacity-50"
          >
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save schedule'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

// ─── Timezone helpers ──────────────────────────────────────────
// Picker works in local time (user-friendly); storage works in UTC
// (cron-stable). Both helpers walk a target Date through the wall-
// clock conversion using Intl.DateTimeFormat — no Luxon / dayjs.

function localToUtc(localDay: number, localHour: number, tz: string): { day: number; hour: number } {
  // Pick a fresh date for the requested local day-of-week + hour
  // in `tz`. Iterate the next 7 days, find one where the local
  // weekday + hour match, then read UTC values off it.
  const now = new Date();
  for (let i = 0; i < 8; i += 1) {
    const candidate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    candidate.setUTCHours(localHour, 0, 0, 0);
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: 'numeric', hour12: false });
    const parts = fmt.formatToParts(candidate);
    const weekdayShort = parts.find((p) => p.type === 'weekday')?.value ?? '';
    const hourPart = Number(parts.find((p) => p.type === 'hour')?.value ?? '-1');
    const localDayIdx = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekdayShort);
    if (localDayIdx === localDay && hourPart === localHour) {
      return { day: candidate.getUTCDay(), hour: candidate.getUTCHours() };
    }
  }
  // Fallback: treat the inputs as UTC — better than dropping the
  // save on the floor.
  return { day: localDay, hour: localHour };
}

function utcToLocal(utcDay: number, utcHour: number, tz: string): { day: number; hour: number } {
  // Mirror image — find a date in the next 7 days that lands on
  // the given UTC day/hour, then format it in `tz` to read the
  // local weekday + hour.
  const now = new Date();
  for (let i = 0; i < 8; i += 1) {
    const candidate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    candidate.setUTCHours(utcHour, 0, 0, 0);
    if (candidate.getUTCDay() === utcDay) {
      const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: 'numeric', hour12: false });
      const parts = fmt.formatToParts(candidate);
      const weekdayShort = parts.find((p) => p.type === 'weekday')?.value ?? '';
      const hourPart = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
      const localDayIdx = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekdayShort);
      return { day: localDayIdx >= 0 ? localDayIdx : utcDay, hour: hourPart };
    }
  }
  return { day: utcDay, hour: utcHour };
}

// Render a persisted schedule row as a short human-readable line —
// "Fri 2:00 AM · America/Phoenix" — using the row's stored
// display_timezone so the status strip reads in the same tz the
// admin originally picked, regardless of where they're viewing it.
function describeSchedule(s: ScheduleRow): string {
  const { day: localDay, hour: localHour } = utcToLocal(s.day_of_week, s.hour_utc, s.display_timezone || 'UTC');
  const dayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][localDay] ?? 'Sun';
  const hourLabel = fmtHour(localHour).replace(':00 ', '').replace(/ \(.*\)$/, '');
  return `${dayShort} ${hourLabel} · ${s.display_timezone || 'UTC'}`;
}

function fmtHour(h: number): string {
  if (h === 0) return '12:00 AM (midnight)';
  if (h === 12) return '12:00 PM (noon)';
  if (h < 12) return `${h}:00 AM`;
  return `${h - 12}:00 PM`;
}
