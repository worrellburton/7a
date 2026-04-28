'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';

// Single tabbed page combining the four formerly-separate Website
// Requests views (Overview · VObs · Forms · Careers). Tab state is
// reflected in ?tab=… so admins can deep-link / refresh and stay on
// the same view.
//
// Each tab does its own data fetch on activation; the lists are
// small enough that there's no value in pre-fetching all four.

type Tab = 'overview' | 'vobs' | 'forms' | 'careers';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'vobs', label: 'VOBs' },
  { id: 'forms', label: 'Forms' },
  { id: 'careers', label: 'Careers' },
];

function isTab(v: string | null): v is Tab {
  return v === 'overview' || v === 'vobs' || v === 'forms' || v === 'careers';
}

export default function WebsiteRequestsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const requested = params?.get('tab') ?? null;
  const initial: Tab = isTab(requested) ? requested : 'overview';
  const [tab, setTab] = useState<Tab>(initial);

  function selectTab(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === 'overview') url.searchParams.delete('tab');
    else url.searchParams.set('tab', next);
    router.replace(url.pathname + url.search, { scroll: false });
  }

  // PageGuard already enforces access based on department + admin —
  // no need to re-check isAdmin here. (Restricting to admins would
  // hide the page from Marketing & Admissions teammates who own
  // these submissions in their day-to-day work.)
  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-1">Marketing &amp; Admissions</p>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Website Requests
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          Submissions from every form on the public site.
        </p>
      </header>

      <div className="mb-5 flex gap-1 border-b border-black/10">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => selectTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'text-primary border-primary'
                : 'text-foreground/60 border-transparent hover:text-foreground hover:border-foreground/20'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewPanel onJump={selectTab} />}
      {tab === 'vobs' && <VobsPanel />}
      {tab === 'forms' && <FormsPanel />}
      {tab === 'careers' && <CareersPanel />}
    </div>
  );
}

// ------------- Overview ----------------------------------------------------

interface RecentVob {
  id: string;
  full_name: string;
  insurance_provider: string | null;
  status: string;
  received_at: string;
}
interface RecentForm {
  id: string;
  source: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  status: string;
  created_at: string;
}
interface OverviewData {
  vobs: { total: number; new: number; recent: RecentVob[] };
  forms: { total: number; new: number; recent: RecentForm[] };
}

function OverviewPanel({ onJump }: { onJump: (t: Tab) => void }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/website-requests/overview', { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as OverviewData;
        if (cancelled) return;
        setData(json);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (error) return <p className="text-sm text-red-600">Error: {error}</p>;
  if (!data) return <p className="text-sm text-foreground/50">Loading…</p>;

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <CategoryCard
        title="VOBs"
        onClick={() => onJump('vobs')}
        description="Insurance verification requests from the admissions form."
        total={data.vobs.total}
        newCount={data.vobs.new}
        tone="amber"
        recent={data.vobs.recent.map((r) => ({
          id: r.id,
          line1: r.full_name,
          line2: r.insurance_provider ?? '(no insurance listed)',
          ts: r.received_at,
        }))}
      />
      <CategoryCard
        title="Forms"
        onClick={() => onJump('forms')}
        description="Contact, footer, and exit-intent submissions from the public site."
        total={data.forms.total}
        newCount={data.forms.new}
        tone="blue"
        recent={data.forms.recent.map((r) => ({
          id: r.id,
          line1: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email || '(no name)',
          line2: `${r.source ?? 'unknown source'}${r.email && (r.first_name || r.last_name) ? ` · ${r.email}` : ''}`,
          ts: r.created_at,
        }))}
      />
    </div>
  );
}

interface RecentItem { id: string; line1: string; line2: string; ts: string; }

function CategoryCard({
  title, onClick, description, total, newCount, recent, tone,
}: {
  title: string; onClick: () => void; description: string;
  total: number; newCount: number; recent: RecentItem[]; tone: 'amber' | 'blue';
}) {
  const accent = tone === 'amber' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200';
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-xl border border-black/10 bg-white p-5 hover:border-primary/40 transition-colors flex flex-col"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{title}</h2>
          <p className="text-xs text-foreground/60 mt-0.5">{description}</p>
        </div>
        {newCount > 0 && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${accent}`}>
            {newCount} new
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl font-bold text-foreground tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{total}</span>
        <span className="text-xs text-foreground/50">total</span>
      </div>
      {recent.length > 0 ? (
        <ul className="space-y-2 flex-1">
          {recent.map((r) => (
            <li key={r.id} className="text-xs flex items-center justify-between gap-3 border-t border-black/5 pt-2">
              <div className="min-w-0">
                <p className="font-semibold text-foreground/85 truncate">{r.line1}</p>
                <p className="text-foreground/50 truncate">{r.line2}</p>
              </div>
              <span className="text-foreground/40 flex-shrink-0">
                {new Date(r.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-foreground/50 italic">No submissions yet.</p>
      )}
      <p className="text-xs text-primary font-semibold mt-4">Open {title} →</p>
    </button>
  );
}

// ------------- Shared: responded state ------------------------------------

interface RespondedFields {
  responded_at: string | null;
  responded_by: string | null;
  responded_note: string | null;
  responder_name: string | null;
  responder_avatar_url: string | null;
}

function formatRespondedAt(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function useRespond(kind: 'vob' | 'contact') {
  const [busyId, setBusyId] = useState<string | null>(null);
  const respond = useCallback(async (
    id: string,
    opts: { clear?: boolean; note?: string } = {},
  ): Promise<RespondedFields | null> => {
    const { clear = false, note } = opts;
    setBusyId(id);
    try {
      const res = await fetch('/api/website-requests/respond', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, id, clear, note }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return {
        responded_at: json.responded_at ?? null,
        responded_by: json.responded_by ?? null,
        responded_note: json.responded_note ?? null,
        responder_name: json.responder_name ?? null,
        responder_avatar_url: json.responder_avatar_url ?? null,
      };
    } catch (e) {
      console.error('respond failed', e);
      return null;
    } finally {
      setBusyId(null);
    }
  }, [kind]);
  return { respond, busyId };
}

function useMarkSpam() {
  const [busyId, setBusyId] = useState<string | null>(null);
  const markSpam = useCallback(async (id: string, spam: boolean): Promise<boolean> => {
    setBusyId(id);
    try {
      const res = await fetch('/api/website-requests/mark-spam', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, spam }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (e) {
      console.error('mark-spam failed', e);
      return false;
    } finally {
      setBusyId(null);
    }
  }, []);
  return { markSpam, busyId };
}

function SpamButton({
  isSpam, onMark, onUnmark, busy,
}: {
  isSpam: boolean;
  onMark: () => void;
  onUnmark: () => void;
  busy: boolean;
}) {
  // Single-click toggle. When the row is already spam, the button
  // turns into an "Unspam" affordance so a misclick can be reversed
  // without leaving the row.
  if (isSpam) {
    return (
      <button
        type="button"
        onClick={onUnmark}
        disabled={busy}
        title="Unmark as spam"
        aria-label="Unmark as spam"
        className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-40"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onMark}
      disabled={busy}
      title="Mark as spam"
      aria-label="Mark as spam"
      className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-black/10 bg-white text-foreground/55 hover:text-amber-700 hover:border-amber-300 hover:bg-amber-50 transition-colors disabled:opacity-40"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
      </svg>
    </button>
  );
}

function useDelete(kind: 'vob' | 'contact') {
  const [busyId, setBusyId] = useState<string | null>(null);
  const remove = useCallback(async (id: string): Promise<boolean> => {
    setBusyId(id);
    try {
      const res = await fetch('/api/website-requests/delete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (e) {
      console.error('delete failed', e);
      return false;
    } finally {
      setBusyId(null);
    }
  }, [kind]);
  return { remove, busyId };
}

function DeleteButton({
  onConfirm, busy,
}: {
  onConfirm: () => void; busy: boolean;
}) {
  // Two-step delete: first click arms the action, second click confirms.
  // Cancelling reverts the button. 4s auto-reset so the red button
  // doesn't linger if the admin wanders off.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(id);
  }, [armed]);

  if (armed) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => { setArmed(false); onConfirm(); }}
          disabled={busy}
          className="inline-flex items-center rounded-md bg-red-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {busy ? 'Deleting…' : 'Confirm'}
        </button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          disabled={busy}
          className="text-[10px] text-foreground/50 underline decoration-dotted hover:text-foreground disabled:opacity-40"
        >
          cancel
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setArmed(true)}
      disabled={busy}
      title="Delete submission"
      aria-label="Delete submission"
      className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-black/10 bg-white text-foreground/55 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors disabled:opacity-40"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
      </svg>
    </button>
  );
}

function ResponderAvatar({
  url, name, size = 18,
}: { url: string | null; name: string | null; size?: number }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name ? `${name}'s avatar` : 'Responder avatar'}
        referrerPolicy="no-referrer"
        className="rounded-full object-cover ring-1 ring-emerald-200 bg-emerald-100"
        style={{ width: size, height: size }}
        loading="lazy"
      />
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-emerald-200 text-emerald-900 font-bold"
      style={{ width: size, height: size, fontSize: Math.max(9, Math.floor(size * 0.55)) }}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}

function RespondedBadge({
  respondedAt, responderName, responderAvatarUrl, respondedNote,
}: {
  respondedAt: string;
  responderName: string | null;
  responderAvatarUrl: string | null;
  respondedNote: string | null;
}) {
  // Note tooltip — shows the follow-up text on hover. We render our
  // own bubble (rather than the native title attribute) so we can
  // wrap long notes nicely and show the metadata header above them.
  const stamp = `Responded ${formatRespondedAt(respondedAt)}${responderName ? ` by ${responderName}` : ''}`;
  return (
    <span className="relative inline-block group">
      <span
        className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 pl-1 pr-2 py-0.5 text-[11px] font-medium text-emerald-800 cursor-default"
      >
        <ResponderAvatar url={responderAvatarUrl} name={responderName} />
        <span>
          {responderName ?? 'Responded'} · {new Date(respondedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
        {respondedNote ? (
          <svg className="w-3 h-3 text-emerald-700/70" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        ) : null}
      </span>
      {/* Hover bubble */}
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-20 mt-1.5 w-72 rounded-lg border border-black/10 bg-white p-3 text-left shadow-lg opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0"
      >
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
          {stamp}
        </span>
        {respondedNote ? (
          <span className="mt-1.5 block text-[12px] leading-relaxed text-foreground/80 whitespace-pre-wrap">
            {respondedNote}
          </span>
        ) : (
          <span className="mt-1.5 block text-[11px] italic text-foreground/45">
            No note recorded.
          </span>
        )}
      </span>
    </span>
  );
}

function RespondButton({
  responded_at, responder_name, responder_avatar_url, responded_note,
  onRespond, onClear, busy, compact = false,
}: {
  responded_at: string | null;
  responder_name: string | null;
  responder_avatar_url: string | null;
  responded_note: string | null;
  /** Called when admin saves the response with an optional note. */
  onRespond: (note: string) => void;
  /** Called when the row was already marked and the admin clicks "undo". */
  onClear: () => void;
  busy: boolean;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus the textarea once the popover opens so the admin can
  // start typing immediately.
  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  if (responded_at) {
    return (
      <div className={`flex ${compact ? 'flex-col items-end gap-0.5' : 'items-center gap-2'}`}>
        <RespondedBadge
          respondedAt={responded_at}
          responderName={responder_name}
          responderAvatarUrl={responder_avatar_url}
          respondedNote={responded_note}
        />
        <button
          type="button"
          onClick={onClear}
          disabled={busy}
          className="text-[10px] text-foreground/50 underline decoration-dotted hover:text-foreground disabled:opacity-40"
        >
          {busy ? '…' : 'undo'}
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="relative inline-block">
        <div className="absolute right-0 top-0 z-30 w-72 rounded-xl border border-black/10 bg-white p-3 shadow-lg">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/55 mb-1.5">
            Add a note (optional)
          </p>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What did you say to them? Left a voicemail at 2pm, sent the VOB form, etc."
            rows={4}
            maxLength={2000}
            className="w-full rounded-md border border-black/10 px-2 py-1.5 text-[12px] leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
            onKeyDown={(e) => {
              // Cmd/Ctrl-Enter saves; Escape cancels.
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                onRespond(draft.trim());
                setEditing(false);
                setDraft('');
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setEditing(false);
                setDraft('');
              }
            }}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[10px] text-foreground/40">⌘↵ to save</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setEditing(false); setDraft(''); }}
                className="text-[11px] text-foreground/55 hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onRespond(draft.trim());
                  setEditing(false);
                  setDraft('');
                }}
                disabled={busy}
                className="inline-flex items-center rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {busy ? 'Saving…' : 'Mark responded'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      disabled={busy}
      className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-white px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary hover:text-white disabled:opacity-50 transition-colors"
    >
      {busy ? 'Saving…' : 'I responded'}
    </button>
  );
}

// ------------- VOB attempts (multi-attempt follow-up) ---------------------

interface Attempt {
  at: string;
  by: string | null;
  by_name: string | null;
  by_avatar_url: string | null;
  note: string | null;
}

const ATTEMPT_LABELS = ['1st attempt', '2nd attempt', '3rd attempt'] as const;

function useVobAttempt() {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  // busyKey is `${rowId}:${attemptIndex}` so two pills on the same
  // row don't disable each other while one is saving.
  const submit = useCallback(async (
    id: string,
    attemptIndex: 1 | 2 | 3,
    opts: { clear?: boolean; note?: string } = {},
  ): Promise<{ attempts: (Attempt | null)[] } | null> => {
    const key = `${id}:${attemptIndex}`;
    setBusyKey(key);
    try {
      const res = await fetch('/api/website-requests/respond', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'vob', id, attempt_index: attemptIndex, clear: !!opts.clear, note: opts.note ?? null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return { attempts: Array.isArray(json.attempts) ? json.attempts : [null, null, null] };
    } catch (e) {
      console.error('vob attempt failed', e);
      return null;
    } finally {
      setBusyKey(null);
    }
  }, []);
  return { submit, busyKey };
}

function useVobAdminNotes() {
  const [busyId, setBusyId] = useState<string | null>(null);
  const save = useCallback(async (id: string, notes: string): Promise<string | null | undefined> => {
    setBusyId(id);
    try {
      const res = await fetch('/api/website-requests/vob-admin-notes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, notes }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return (json.admin_notes ?? null) as string | null;
    } catch (e) {
      console.error('admin notes save failed', e);
      return undefined;
    } finally {
      setBusyId(null);
    }
  }, []);
  return { save, busyId };
}

function AttemptAvatar({ url, name, size = 18 }: { url: string | null; name: string | null; size?: number }) {
  // Same shape as ResponderAvatar but tinted neutral/blue rather
  // than the responded-emerald, so a filled pill reads as "log of
  // who made the attempt" instead of "this is fully resolved".
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name ? `${name}'s avatar` : 'Responder avatar'}
        referrerPolicy="no-referrer"
        className="rounded-full object-cover ring-1 ring-blue-200 bg-blue-100"
        style={{ width: size, height: size }}
        loading="lazy"
      />
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-blue-200 text-blue-900 font-bold"
      style={{ width: size, height: size, fontSize: Math.max(9, Math.floor(size * 0.55)) }}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}

function AttemptPill({
  index,
  attempt,
  onSave,
  onClear,
  busy,
}: {
  index: 0 | 1 | 2;
  attempt: Attempt | null;
  onSave: (note: string) => void;
  onClear: () => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const label = ATTEMPT_LABELS[index];

  // Seed the textarea with the existing note when editing a filled
  // pill, blank when filling an empty one.
  useEffect(() => {
    if (open) {
      setDraft(attempt?.note ?? '');
      // requestAnimationFrame so the popover is mounted before focus.
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [open, attempt]);

  const filled = !!attempt;
  const firstName = (attempt?.by_name ?? '').split(' ')[0] || attempt?.by_name || 'Unknown';
  const dateLabel = attempt
    ? new Date(attempt.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  const stamp = attempt
    ? `${label} · ${formatRespondedAt(attempt.at)}${attempt.by_name ? ` by ${attempt.by_name}` : ''}`
    : label;

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        title={stamp}
        className={
          filled
            ? 'inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 pl-1 pr-2 py-0.5 text-[11px] font-medium text-blue-900 hover:bg-blue-100 transition-colors disabled:opacity-50'
            : 'inline-flex items-center rounded-full border border-dashed border-foreground/25 bg-white px-2.5 py-0.5 text-[11px] font-medium text-foreground/55 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-colors disabled:opacity-50'
        }
      >
        {filled ? (
          <>
            <AttemptAvatar url={attempt!.by_avatar_url} name={attempt!.by_name} />
            <span>{firstName} · {dateLabel}</span>
            {attempt!.note ? (
              <svg className="w-3 h-3 text-blue-700/70" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            ) : null}
          </>
        ) : (
          <span>{label}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1.5 w-72 rounded-xl border border-black/10 bg-white p-3 shadow-lg text-left">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/55 mb-1.5">
            {filled ? `Edit ${label.toLowerCase()}` : `Log ${label.toLowerCase()}`}
          </p>
          {filled && attempt?.by_name && (
            <p className="text-[11px] text-foreground/50 mb-1.5">
              Originally by <span className="font-medium text-foreground/70">{attempt.by_name}</span> · {formatRespondedAt(attempt.at)}
            </p>
          )}
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What happened on this attempt? Left a voicemail at 2pm, sent the VOB form, etc."
            rows={4}
            maxLength={2000}
            className="w-full rounded-md border border-black/10 px-2 py-1.5 text-[12px] leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                onSave(draft.trim());
                setOpen(false);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setOpen(false);
              }
            }}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[10px] text-foreground/40">⌘↵ to save</span>
            <div className="flex items-center gap-2">
              {filled && (
                <button
                  type="button"
                  onClick={() => { onClear(); setOpen(false); }}
                  disabled={busy}
                  className="text-[11px] text-red-600/80 hover:text-red-700 underline decoration-dotted disabled:opacity-40"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[11px] text-foreground/55 hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { onSave(draft.trim()); setOpen(false); }}
                disabled={busy}
                className="inline-flex items-center rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}

function AttemptsCell({
  rowId,
  attempts,
  onSubmit,
  busyKey,
}: {
  rowId: string;
  attempts: (Attempt | null)[];
  onSubmit: (attemptIndex: 1 | 2 | 3, opts: { clear?: boolean; note?: string }) => void;
  busyKey: string | null;
}) {
  const slots: (Attempt | null)[] = [attempts[0] ?? null, attempts[1] ?? null, attempts[2] ?? null];
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {slots.map((slot, i) => {
        const idx1 = (i + 1) as 1 | 2 | 3;
        const key = `${rowId}:${idx1}`;
        return (
          <AttemptPill
            key={i}
            index={i as 0 | 1 | 2}
            attempt={slot}
            onSave={(note) => onSubmit(idx1, { note })}
            onClear={() => onSubmit(idx1, { clear: true })}
            busy={busyKey === key}
          />
        );
      })}
    </div>
  );
}

function AdminNotesCell({
  customerNote,
  adminNotes,
  onSave,
  busy,
}: {
  customerNote: string | null;
  adminNotes: string | null;
  onSave: (next: string) => void;
  busy: boolean;
}) {
  // Click-to-edit textarea. Empty rows show a faint "Add note" hint
  // so it's discoverable without taking up much space. The customer's
  // form-submitted note (if any) renders as an italic subtitle so
  // the admin can see the original context without losing their own
  // notes underneath.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(adminNotes ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(adminNotes ?? '');
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
      });
    }
  }, [editing, adminNotes]);

  if (editing) {
    return (
      <div className="space-y-1.5">
        {customerNote && (
          <p className="text-[10px] italic text-foreground/40 leading-snug">
            From form: <span className="not-italic text-foreground/55">{customerNote}</span>
          </p>
        )}
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Notes about this person…"
          rows={3}
          maxLength={4000}
          className="w-full min-w-[180px] rounded-md border border-primary/40 px-2 py-1.5 text-[12px] leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              onSave(draft);
              setEditing(false);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setEditing(false);
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-foreground/40">⌘↵ to save</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-[11px] text-foreground/55 hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { onSave(draft); setEditing(false); }}
              disabled={busy}
              className="inline-flex items-center rounded-md bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title={adminNotes ? 'Edit notes' : 'Add notes'}
      className="block w-full text-left rounded-md px-1 -mx-1 py-0.5 hover:bg-warm-bg/60 transition-colors"
    >
      {customerNote && (
        <p className="text-[10px] italic text-foreground/40 leading-snug mb-0.5">
          From form: <span className="not-italic text-foreground/55">{customerNote}</span>
        </p>
      )}
      {adminNotes ? (
        <span className="text-xs text-foreground/75 line-clamp-3 whitespace-pre-wrap">{adminNotes}</span>
      ) : !customerNote ? (
        <span className="text-foreground/30 text-xs italic">Add notes…</span>
      ) : null}
    </button>
  );
}

// ------------- VObs (spreadsheet view) ------------------------------------

interface VobRow extends RespondedFields {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  insurance_provider: string | null;
  status: string;
  notes: string | null;
  admin_notes: string | null;
  attempts: (Attempt | null)[];
  received_at: string;
  card_front_url: string | null;
  card_back_url: string | null;
}

function VobsPanel() {
  const [rows, setRows] = useState<VobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { submit: submitAttempt, busyKey: attemptBusyKey } = useVobAttempt();
  const { save: saveAdminNotes, busyId: notesBusyId } = useVobAdminNotes();
  const { remove, busyId: deletingId } = useDelete('vob');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/website-requests/vobs', { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setRows(data.rows ?? []);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleAttempt(id: string, attemptIndex: 1 | 2 | 3, opts: { clear?: boolean; note?: string }) {
    const result = await submitAttempt(id, attemptIndex, opts);
    if (!result) return;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, attempts: result.attempts } : r)));
  }

  async function handleAdminNotes(id: string, next: string) {
    const result = await saveAdminNotes(id, next);
    if (result === undefined) return;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, admin_notes: result } : r)));
  }

  async function handleDelete(id: string) {
    const ok = await remove(id);
    if (ok) setRows((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <Section count={rows.length} loading={loading} error={error} emptyText="No VOB requests yet.">
      <div className="overflow-x-auto border border-black/10 rounded-xl bg-white">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-warm-bg/60 text-left text-[11px] uppercase tracking-wider text-foreground/55">
            <tr>
              <Th>Name</Th>
              <Th>Contact</Th>
              <Th>Insurance</Th>
              <Th>Cards</Th>
              <Th>Notes</Th>
              <Th>Status</Th>
              <Th>Received</Th>
              <Th className="text-right">Attempts</Th>
              <Th className="text-right"><span className="sr-only">Actions</span></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((r) => (
              <tr key={r.id} className="align-top">
                <Td>
                  <p className="font-semibold text-foreground">{r.full_name}</p>
                </Td>
                <Td>
                  <div className="text-xs text-foreground/70 space-y-0.5">
                    {r.phone && <p>{r.phone}</p>}
                    {r.email && <p className="truncate max-w-[220px]">{r.email}</p>}
                  </div>
                </Td>
                <Td>{r.insurance_provider ?? <span className="text-foreground/40">—</span>}</Td>
                <Td>
                  {(r.card_front_url || r.card_back_url) ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {r.card_front_url && <CardThumb url={r.card_front_url} label="Front" />}
                      {r.card_back_url && <CardThumb url={r.card_back_url} label="Back" />}
                    </div>
                  ) : (
                    <span className="text-foreground/40">—</span>
                  )}
                </Td>
                <Td>
                  <AdminNotesCell
                    customerNote={r.notes}
                    adminNotes={r.admin_notes}
                    onSave={(next) => handleAdminNotes(r.id, next)}
                    busy={notesBusyId === r.id}
                  />
                </Td>
                <Td><StatusChip status={r.status} /></Td>
                <Td>
                  <span className="text-xs text-foreground/60 whitespace-nowrap">
                    {new Date(r.received_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                    })}
                  </span>
                </Td>
                <Td className="text-right">
                  <AttemptsCell
                    rowId={r.id}
                    attempts={r.attempts ?? [null, null, null]}
                    onSubmit={(idx, opts) => handleAttempt(r.id, idx, opts)}
                    busyKey={attemptBusyKey}
                  />
                </Td>
                <Td className="text-right">
                  <DeleteButton onConfirm={() => handleDelete(r.id)} busy={deletingId === r.id} />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

// ------------- Forms (non-careers contact submissions) --------------------

interface FormRow extends RespondedFields {
  id: string;
  source: 'contact_page' | 'footer' | 'exit_intent' | 'careers' | 'other' | null;
  first_name: string | null;
  last_name: string | null;
  telephone: string | null;
  email: string | null;
  message: string | null;
  payment_method: string | null;
  consent: boolean;
  page_url: string | null;
  referrer: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  is_spam: boolean;
}

type FormSourceFilter = 'all' | 'contact_page' | 'footer' | 'exit_intent' | 'other';
const FORM_SOURCE_LABELS: Record<Exclude<FormSourceFilter, 'all'>, string> = {
  contact_page: 'Contact Page',
  footer: 'Footer',
  exit_intent: 'Exit Intent',
  other: 'Other',
};

function FormsPanel() {
  const [rows, setRows] = useState<FormRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FormSourceFilter>('all');
  const [showSpam, setShowSpam] = useState(false);
  const { respond, busyId } = useRespond('contact');
  const { remove, busyId: deletingId } = useDelete('contact');
  const { markSpam, busyId: spamId } = useMarkSpam();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/website-requests/forms', { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setRows(data.rows ?? []);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const spamCount = useMemo(() => rows.filter((r) => r.is_spam).length, [rows]);

  const visible = useMemo(() => {
    let out = rows;
    if (!showSpam) out = out.filter((r) => !r.is_spam);
    if (filter !== 'all') out = out.filter((r) => r.source === filter);
    return out;
  }, [rows, filter, showSpam]);

  async function handleMarkResponded(id: string, note: string) {
    const result = await respond(id, { note });
    if (!result) return;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...result } : r)));
  }
  async function handleClearResponded(id: string) {
    const result = await respond(id, { clear: true });
    if (!result) return;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...result } : r)));
  }

  async function handleDelete(id: string) {
    const ok = await remove(id);
    if (ok) setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleMarkSpam(id: string, spam: boolean) {
    const ok = await markSpam(id, spam);
    if (!ok) return;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, is_spam: spam } : r)));
  }

  return (
    <Section count={rows.length} loading={loading} error={error} emptyText="No submissions yet.">
      <div className="mb-3 flex flex-wrap gap-1.5 items-center">
        <span className="text-xs text-foreground/50 mr-1">Source:</span>
        {(['all', 'contact_page', 'footer', 'exit_intent', 'other'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setFilter(v)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              filter === v
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-foreground/70 border-black/10 hover:border-primary/40 hover:text-primary'
            }`}
          >
            {v === 'all' ? 'All' : FORM_SOURCE_LABELS[v]}
          </button>
        ))}
        <span className="ml-auto" />
        {spamCount > 0 && (
          <button
            type="button"
            onClick={() => setShowSpam((v) => !v)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              showSpam
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-white text-foreground/70 border-black/10 hover:border-amber-300 hover:text-amber-700'
            }`}
            title={showSpam ? 'Hide spam' : 'Show spam'}
          >
            {showSpam ? 'Hide' : 'Show'} spam ({spamCount})
          </button>
        )}
      </div>

      {visible.length === 0 && filter !== 'all' && (
        <p className="text-sm text-foreground/50">No submissions match the current filter.</p>
      )}

      {visible.length > 0 && (
        <div className="overflow-x-auto border border-black/10 rounded-xl bg-white">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-warm-bg/60 text-left text-[11px] uppercase tracking-wider text-foreground/55">
              <tr>
                <Th>Name</Th>
                <Th>Source</Th>
                <Th>Contact</Th>
                <Th>Message</Th>
                <Th>Status</Th>
                <Th>Received</Th>
                <Th className="text-right">Responded</Th>
                <Th className="text-right"><span className="sr-only">Actions</span></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {visible.map((r) => {
                const fullName = [r.first_name, r.last_name].filter(Boolean).join(' ') || '(no name)';
                return (
                  <tr key={r.id} className={`align-top ${r.is_spam ? 'bg-amber-50/40' : ''}`}>
                    <Td>
                      <p className={`font-semibold ${r.is_spam ? 'text-foreground/55' : 'text-foreground'}`}>
                        {fullName}
                      </p>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap items-center gap-1">
                        {r.is_spam && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border bg-amber-100 text-amber-900 border-amber-300">
                            Spam
                          </span>
                        )}
                        {r.source && r.source !== 'careers' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border bg-amber-50 text-amber-800 border-amber-200">
                            {FORM_SOURCE_LABELS[r.source as Exclude<FormSourceFilter, 'all'>] ?? r.source}
                          </span>
                        )}
                        {r.payment_method && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border bg-blue-50 text-blue-700 border-blue-200">
                            {r.payment_method}
                          </span>
                        )}
                        {r.source === 'footer' && !r.consent && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border bg-red-50 text-red-700 border-red-200">
                            No consent
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <div className="text-xs text-foreground/70 space-y-0.5">
                        {r.telephone && <p>{r.telephone}</p>}
                        {r.email && <p className="truncate max-w-[220px]">{r.email}</p>}
                      </div>
                    </Td>
                    <Td>
                      {r.message ? (
                        <p className="text-xs text-foreground/80 line-clamp-3 whitespace-pre-wrap max-w-[340px]">{r.message}</p>
                      ) : (
                        <span className="text-foreground/40">—</span>
                      )}
                      {(r.page_url || r.referrer) && (
                        <p className="text-[11px] text-foreground/40 mt-1 truncate max-w-[340px]">
                          {r.page_url ? `From: ${r.page_url}` : `Referrer: ${r.referrer}`}
                        </p>
                      )}
                    </Td>
                    <Td><StatusChip status={r.status} /></Td>
                    <Td>
                      <span className="text-xs text-foreground/60 whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                        })}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <RespondButton
                        responded_at={r.responded_at}
                        responder_name={r.responder_name}
                        responder_avatar_url={r.responder_avatar_url}
                        responded_note={r.responded_note}
                    onRespond={(n) => handleMarkResponded(r.id, n)}
                    onClear={() => handleClearResponded(r.id)}
                        busy={busyId === r.id}
                        compact
                      />
                    </Td>
                    <Td className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <SpamButton
                          isSpam={r.is_spam}
                          onMark={() => handleMarkSpam(r.id, true)}
                          onUnmark={() => handleMarkSpam(r.id, false)}
                          busy={spamId === r.id}
                        />
                        <DeleteButton onConfirm={() => handleDelete(r.id)} busy={deletingId === r.id} />
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

// ------------- Careers ----------------------------------------------------

function trackFromMessage(message: string | null): { track: string | null; rest: string } {
  if (!message) return { track: null, rest: '' };
  const m = message.match(/^\[([^\]]+)\]\s*\n*([\s\S]*)$/);
  if (!m) return { track: null, rest: message };
  return { track: m[1], rest: m[2].trim() };
}

function CareersPanel() {
  const [rows, setRows] = useState<FormRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { respond, busyId } = useRespond('contact');
  const { remove, busyId: deletingId } = useDelete('contact');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/website-requests/careers', { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setRows(data.rows ?? []);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleMarkResponded(id: string, note: string) {
    const result = await respond(id, { note });
    if (!result) return;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...result } : r)));
  }
  async function handleClearResponded(id: string) {
    const result = await respond(id, { clear: true });
    if (!result) return;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...result } : r)));
  }

  async function handleDelete(id: string) {
    const ok = await remove(id);
    if (ok) setRows((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <Section count={rows.length} loading={loading} error={error} emptyText="No careers submissions yet.">
      <div className="overflow-x-auto border border-black/10 rounded-xl bg-white">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-warm-bg/60 text-left text-[11px] uppercase tracking-wider text-foreground/55">
            <tr>
              <Th>Name</Th>
              <Th>Track</Th>
              <Th>Email</Th>
              <Th>Message</Th>
              <Th>Status</Th>
              <Th>Received</Th>
              <Th className="text-right">Responded</Th>
              <Th className="text-right"><span className="sr-only">Actions</span></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((r) => {
              const { track, rest } = trackFromMessage(r.message);
              const fullName = [r.first_name, r.last_name].filter(Boolean).join(' ') || '(no name)';
              return (
                <tr key={r.id} className="align-top">
                  <Td>
                    <p className="font-semibold text-foreground">{fullName}</p>
                  </Td>
                  <Td>
                    {track ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border bg-amber-50 text-amber-800 border-amber-200">
                        {track}
                      </span>
                    ) : (
                      <span className="text-foreground/40">—</span>
                    )}
                  </Td>
                  <Td>
                    {r.email ? (
                      <Link className="text-xs text-foreground/70 underline decoration-dotted hover:text-primary" href={`mailto:${r.email}`}>
                        {r.email}
                      </Link>
                    ) : (
                      <span className="text-foreground/40">—</span>
                    )}
                  </Td>
                  <Td>
                    {rest ? (
                      <p className="text-xs text-foreground/80 line-clamp-3 whitespace-pre-wrap max-w-[380px]">{rest}</p>
                    ) : (
                      <span className="text-foreground/40">—</span>
                    )}
                  </Td>
                  <Td><StatusChip status={r.status} /></Td>
                  <Td>
                    <span className="text-xs text-foreground/60 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                      })}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <RespondButton
                      responded_at={r.responded_at}
                      responder_name={r.responder_name}
                      responder_avatar_url={r.responder_avatar_url}
                      responded_note={r.responded_note}
                    onRespond={(n) => handleMarkResponded(r.id, n)}
                    onClear={() => handleClearResponded(r.id)}
                      busy={busyId === r.id}
                      compact
                    />
                  </Td>
                  <Td className="text-right">
                    <DeleteButton onConfirm={() => handleDelete(r.id)} busy={deletingId === r.id} />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

// ------------- Shared bits -------------------------------------------------

function Section({
  count, loading, error, emptyText, children,
}: {
  count: number; loading: boolean; error: string | null;
  emptyText: string; children: React.ReactNode;
}) {
  if (loading) return <p className="text-sm text-foreground/50">Loading…</p>;
  if (error) return <p className="text-sm text-red-600">Error: {error}</p>;
  if (count === 0) return <p className="text-sm text-foreground/50">{emptyText}</p>;
  return <>{children}</>;
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 font-semibold border-b border-black/10 ${className}`}>{children}</th>;
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 ${className}`}>{children}</td>;
}

function StatusChip({ status }: { status: string }) {
  const tone = status === 'new'
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : status === 'contacted' || status === 'verified'
    ? 'bg-amber-50 text-amber-800 border-amber-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${tone}`}>
      {status}
    </span>
  );
}

function CardThumb({ url, label }: { url: string; label: string }) {
  // Render a small clickable thumbnail. Storage signed URLs include a
  // `?token=...` query string; PDFs (no image preview) get a generic
  // file glyph instead of a broken image.
  const isPdf = /\.pdf(\?|$)/i.test(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={`Open ${label.toLowerCase()} of card`}
      className="group inline-flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-1.5 py-1 text-[11px] font-medium text-foreground/70 hover:border-primary/40 hover:text-primary transition-colors"
    >
      {isPdf ? (
        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v4a1 1 0 001 1h4M5 21V5a2 2 0 012-2h8l5 5v13a2 2 0 01-2 2H7a2 2 0 01-2-2z" />
        </svg>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`${label} of insurance card`}
          className="w-8 h-6 rounded-sm object-cover bg-warm-bg"
          loading="lazy"
        />
      )}
      {label}
    </a>
  );
}

