'use client';

// Schedule Posts — simple time-based scheduling.
//
// The old recurring-cadence scheduler (daily/weekly slots + calendar
// drop targets) is gone. The flow is now: the Ready-to-Go drafts sit
// at the top as draggable tiles; drag one onto the Schedule card, pick
// the exact date + time, and it's queued via Ayrshare. The networks it
// posts to come from where the draft was assigned in Creative.

import { useCallback, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';

/* ── Types ───────────────────────────────────────────────────── */

export interface ReadyDraft {
  id: string;
  caption: string;
  mediaUrls: string[];
  createdAt: string;
  // Platforms chosen for this draft in Creative. The schedule card
  // posts to these (intersected with the connected accounts) so the
  // operator doesn't re-pick networks at schedule time.
  platforms?: string[];
}

/* ── Error banner with copy-to-clipboard ─────────────────────── */

// Any posting error renders here with a "Copy details" button. The
// copied blob carries the full context (HTTP status, the raw Ayrshare
// response, and the request we sent) so it can be pasted back verbatim
// for diagnosis instead of just the one-line summary.
function PostErrorBanner({ message, context }: { message: string; context: unknown }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const text = typeof context === 'string' ? context : JSON.stringify(context, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API blocked — fall back to a temporary textarea select.
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch { /* give up silently */ }
    }
  };
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 mb-3" role="alert">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-red-800 min-w-0 break-words">{message}</p>
        <button
          type="button"
          onClick={() => void copy()}
          className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-red-700 hover:text-red-900 underline decoration-dotted"
        >
          {copied ? 'Copied ✓' : 'Copy details'}
        </button>
      </div>
    </div>
  );
}

/* ── Ready drafts card (draggable source) ────────────────────── */

// Exported so the Post tab + Schedule tab can render Ready-to-Go as
// its own card. Each tile is draggable and carries the full draft on
// the dataTransfer so a drop target can schedule it directly.
export function ReadyToGoCard({ drafts }: { drafts: ReadyDraft[] }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white px-4 py-4 lg:px-5 lg:py-5">
      <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Ready · {drafts.length}</h2>
          <p className="text-[11px] text-foreground/45 mt-0.5">
            Drag a draft down onto the Post now or Schedule card to publish it.
          </p>
        </div>
      </div>
      {drafts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/15 bg-warm-bg/30 px-5 py-8 text-center">
          <p className="text-[12.5px] text-foreground/55 max-w-md mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
            Mark drafts as <em>Ready</em> in Compose to land them here.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {drafts.map((d) => (
            <ReadyDraftTile key={d.id} draft={d} />
          ))}
        </ul>
      )}
    </section>
  );
}

// One draggable tile. Pulled out so we can wire the dataTransfer
// payload + cursor styling in one place and so the inner <img>
// stays `draggable={false}` — without that, the browser's native
// image-drag intercepts the gesture and our 'application/x-ready-draft'
// MIME type never gets set, so every drop target rejected the drop.
function ReadyDraftTile({ draft }: { draft: ReadyDraft }) {
  const thumb = draft.mediaUrls[0];
  const isVideo = typeof thumb === 'string' && /\.(mp4|mov|webm|m4v)(\?|$)/i.test(thumb);
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-ready-draft', JSON.stringify(draft));
        e.dataTransfer.effectAllowed = 'copy';
      }}
      className="group relative rounded-lg overflow-hidden border border-emerald-200 bg-emerald-50/40 cursor-grab active:cursor-grabbing aspect-square"
      title={draft.caption || '(no caption)'}
    >
      {thumb ? (
        isVideo ? (
          <video
            src={thumb}
            preload="metadata"
            muted
            playsInline
            draggable={false}
            className="w-full h-full object-cover bg-black pointer-events-none"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={draft.caption}
            draggable={false}
            className="w-full h-full object-cover pointer-events-none"
          />
        )
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-warm-bg/40 text-[10px] text-foreground/45 px-1.5 text-center" style={{ fontFamily: 'var(--font-body)' }}>
          No media
        </div>
      )}
      <span className="absolute top-1 left-1 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-white" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 px-1.5 py-1 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <p className="text-[10px] text-white leading-tight line-clamp-2" style={{ fontFamily: 'var(--font-body)' }}>
          {draft.caption || '(no caption)'}
        </p>
      </div>
    </li>
  );
}

/* ── Schedule drop card ──────────────────────────────────────── */

// The drop target. Drag a Ready-to-Go draft onto it, pick a date +
// time, and it fires a real Ayrshare-scheduled post (POST
// /api/social-media/post with scheduleDate). Networks come from the
// draft's Creative assignment, intersected with the connected set.
// Quick-pick options for the schedule date. Weekday values are 0=Sun..6=Sat.
const QUICK_OPTIONS: { label: string; value: string }[] = [
  { label: 'Tomorrow', value: 'tomorrow' },
  { label: 'Next Mon', value: '1' },
  { label: 'Next Tue', value: '2' },
  { label: 'Next Wed', value: '3' },
  { label: 'Next Thu', value: '4' },
  { label: 'Next Fri', value: '5' },
  { label: 'Next Sat', value: '6' },
  { label: 'Next Sun', value: '0' },
];

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Resolve a quick-pick value to a concrete Date, carrying over the time
// already in `currentWhen` (else defaulting to 9:00 AM).
function resolveQuick(value: string, currentWhen: string): Date | null {
  const now = new Date();
  let hours = 9;
  let mins = 0;
  const t = currentWhen.split('T')[1];
  if (t) { const [h, m] = t.split(':').map(Number); if (Number.isFinite(h)) hours = h; if (Number.isFinite(m)) mins = m; }
  const d = new Date(now);
  d.setHours(hours, mins, 0, 0);
  if (value === 'tomorrow') {
    d.setDate(now.getDate() + 1);
    return d;
  }
  const weekday = Number(value);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return null;
  let add = (weekday - now.getDay() + 7) % 7;
  if (add === 0) add = 7; // "next" → the upcoming one, never today
  d.setDate(now.getDate() + add);
  return d;
}

export default function ScheduleDropCard({
  connectedPlatforms,
  onScheduled,
}: {
  connectedPlatforms: string[];
  onScheduled: () => void;
}) {
  const { session } = useAuth();
  const [draft, setDraft] = useState<ReadyDraft | null>(null);
  const [when, setWhen] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errCtx, setErrCtx] = useState<unknown>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  // Which networks this scheduled post goes to — seeded from the draft's
  // Creative assignment (∩ connected) on drop; toggled via the checkmarks.
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());

  // Platforms offered as checkmarks: the draft's assigned networks that
  // are connected, else every connected account.
  const assigned = draft?.platforms ?? [];
  const availablePlatforms = assigned.length > 0
    ? assigned.filter((p) => connectedPlatforms.includes(p))
    : connectedPlatforms;

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
  };

  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-ready-draft')) {
      e.preventDefault();
      setDragOver(true);
    }
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    try {
      const raw = e.dataTransfer.getData('application/x-ready-draft');
      if (!raw) return;
      const parsed = JSON.parse(raw) as ReadyDraft;
      setDraft(parsed);
      const a = parsed.platforms ?? [];
      const avail = a.length > 0 ? a.filter((p) => connectedPlatforms.includes(p)) : connectedPlatforms;
      setSelectedPlatforms(new Set(avail));
      setError(null);
      setOkMsg(null);
    } catch { /* malformed payload — ignore */ }
  };

  const submit = useCallback(async () => {
    if (!draft) return;
    if (!when) { setError('Pick a date and time first.'); return; }
    const at = new Date(when);
    if (Number.isNaN(at.getTime())) { setError("That date / time isn't valid."); return; }
    if (at.getTime() <= Date.now()) { setError('Pick a time in the future.'); return; }
    const targets = Array.from(selectedPlatforms);
    if (targets.length === 0) { setError('Check at least one platform to post to.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        post: draft.caption,
        platforms: targets,
        scheduleDate: at.toISOString(),
      };
      if (draft.mediaUrls.length > 0) body.mediaUrls = draft.mediaUrls;
      const r = await fetch('/api/social-media/post', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError((j as { error?: string; message?: string }).error ?? (j as { message?: string }).message ?? `HTTP ${r.status}`);
        setErrCtx({ at: new Date().toISOString(), action: 'schedule', endpoint: '/api/social-media/post', httpStatus: r.status, response: j, request: { ...body, captionLength: draft.caption.length } });
        return;
      }
      setErrCtx(null);
      setOkMsg(`Scheduled for ${at.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.`);
      setDraft(null);
      setWhen('');
      setSelectedPlatforms(new Set());
      onScheduled();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setErrCtx({ at: new Date().toISOString(), action: 'schedule', endpoint: '/api/social-media/post', threw: true, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setSubmitting(false);
    }
  }, [draft, when, selectedPlatforms, session?.access_token, onScheduled]);

  const thumb = draft?.mediaUrls[0];
  const isVideo = typeof thumb === 'string' && /\.(mp4|mov|webm|m4v)(\?|$)/i.test(thumb);

  return (
    <section className="rounded-2xl border border-black/10 bg-white px-4 py-4 lg:px-5 lg:py-5">
      <div className="mb-3">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Schedule a post</h2>
        <p className="text-[11px] text-foreground/45 mt-0.5">
          Drag a Ready-to-Go draft here, set the exact time, and it posts itself.
        </p>
      </div>

      {okMsg && (
        <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800 mb-3" role="status">
          {okMsg}
        </p>
      )}
      {error && <PostErrorBanner message={error} context={errCtx} />}

      {!draft ? (
        <div
          onDragOver={onDragOver}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`rounded-xl border-2 border-dashed px-5 py-12 text-center transition-colors ${
            dragOver ? 'border-primary bg-primary/[0.04] text-primary' : 'border-black/15 bg-warm-bg/30 text-foreground/55'
          }`}
        >
          <p className="text-[13px] max-w-md mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
            {dragOver ? 'Drop to load this draft into the scheduler.' : 'Drag a Ready-to-Go draft onto this card to schedule it.'}
          </p>
        </div>
      ) : (
        <div
          onDragOver={onDragOver}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`rounded-xl border px-4 py-4 ${dragOver ? 'border-primary ring-2 ring-primary/20' : 'border-black/10'}`}
        >
          {/* One row: draft · platform checkmarks · date/time · quick pick · schedule */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="w-10 h-10 shrink-0 rounded-md overflow-hidden border border-black/10 bg-warm-bg/40">
              {thumb ? (
                isVideo ? (
                  <video src={thumb} muted playsInline className="w-full h-full object-cover bg-black" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="w-full h-full object-cover" />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[8px] text-foreground/45 text-center px-0.5">No media</div>
              )}
            </div>

            <span className="text-[12px] text-foreground/80 truncate max-w-[140px]" title={draft.caption || '(no caption)'}>
              {draft.caption || '(no caption)'}
            </span>

            {availablePlatforms.length === 0 ? (
              <span className="text-[11px] text-red-700">no connected platforms</span>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {availablePlatforms.map((p) => (
                  <label key={p} className="inline-flex items-center gap-1 text-[11.5px] text-foreground/70 capitalize cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.has(p)}
                      onChange={() => togglePlatform(p)}
                      className="w-3.5 h-3.5 accent-primary"
                    />
                    {p}
                  </label>
                ))}
              </div>
            )}

            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-primary/40"
            />

            <select
              value=""
              onChange={(e) => { const d = resolveQuick(e.target.value, when); if (d) setWhen(toLocalInput(d)); }}
              className="rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[12.5px] text-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40"
              aria-label="Quick pick date"
            >
              <option value="">Quick pick…</option>
              {QUICK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <button
              type="button"
              onClick={() => void submit()}
              disabled={submitting}
              className="rounded-lg bg-primary text-white px-3.5 py-1.5 text-[12.5px] font-semibold hover:bg-primary/90 disabled:opacity-40"
            >
              {submitting ? 'Scheduling…' : 'Schedule'}
            </button>

            <button
              type="button"
              onClick={() => { setDraft(null); setWhen(''); setError(null); setSelectedPlatforms(new Set()); }}
              className="text-[10.5px] text-foreground/45 hover:text-foreground/80 uppercase tracking-wider"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/* ── Post-now drop card ──────────────────────────────────────── */

// Sits directly under Ready-to-Go. Drag a Ready-to-Go draft onto it and
// it prompts to publish immediately (no schedule date) — networks come
// from the draft's Creative assignment, intersected with connected.
export function PostNowDropCard({
  connectedPlatforms,
  onPosted,
}: {
  connectedPlatforms: string[];
  onPosted: () => void;
}) {
  const { session } = useAuth();
  const [draft, setDraft] = useState<ReadyDraft | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errCtx, setErrCtx] = useState<unknown>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());

  const assigned = draft?.platforms ?? [];
  const availablePlatforms = assigned.length > 0
    ? assigned.filter((p) => connectedPlatforms.includes(p))
    : connectedPlatforms;

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
  };

  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-ready-draft')) {
      e.preventDefault();
      setDragOver(true);
    }
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    try {
      const raw = e.dataTransfer.getData('application/x-ready-draft');
      if (!raw) return;
      const parsed = JSON.parse(raw) as ReadyDraft;
      setDraft(parsed);
      const a = parsed.platforms ?? [];
      const avail = a.length > 0 ? a.filter((p) => connectedPlatforms.includes(p)) : connectedPlatforms;
      setSelectedPlatforms(new Set(avail));
      setError(null);
      setOkMsg(null);
    } catch { /* malformed payload — ignore */ }
  };

  const submit = useCallback(async () => {
    if (!draft) return;
    const targets = Array.from(selectedPlatforms);
    if (targets.length === 0) { setError('Check at least one platform to post to.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { post: draft.caption, platforms: targets };
      if (draft.mediaUrls.length > 0) body.mediaUrls = draft.mediaUrls;
      const r = await fetch('/api/social-media/post', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError((j as { error?: string; message?: string }).error ?? (j as { message?: string }).message ?? `HTTP ${r.status}`);
        setErrCtx({ at: new Date().toISOString(), action: 'post-now', endpoint: '/api/social-media/post', httpStatus: r.status, response: j, request: { ...body, captionLength: draft.caption.length } });
        return;
      }
      setErrCtx(null);
      setOkMsg(`Posted to ${targets.length} ${targets.length === 1 ? 'network' : 'networks'}.`);
      setDraft(null);
      setSelectedPlatforms(new Set());
      onPosted();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setErrCtx({ at: new Date().toISOString(), action: 'post-now', endpoint: '/api/social-media/post', threw: true, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setSubmitting(false);
    }
  }, [draft, selectedPlatforms, session?.access_token, onPosted]);

  const thumb = draft?.mediaUrls[0];
  const isVideo = typeof thumb === 'string' && /\.(mp4|mov|webm|m4v)(\?|$)/i.test(thumb);

  return (
    <section className="rounded-2xl border border-black/10 bg-white px-4 py-4 lg:px-5 lg:py-5">
      <div className="mb-3">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Post now</h2>
        <p className="text-[11px] text-foreground/45 mt-0.5">
          Drag a Ready-to-Go draft here to publish it right away.
        </p>
      </div>

      {okMsg && (
        <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800 mb-3" role="status">
          {okMsg}
        </p>
      )}
      {error && <PostErrorBanner message={error} context={errCtx} />}

      {!draft ? (
        <div
          onDragOver={onDragOver}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`rounded-xl border-2 border-dashed px-5 py-12 text-center transition-colors ${
            dragOver ? 'border-primary bg-primary/[0.04] text-primary' : 'border-black/15 bg-warm-bg/30 text-foreground/55'
          }`}
        >
          <p className="text-[13px] max-w-md mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
            {dragOver ? 'Drop to load this draft, then confirm Post now.' : 'Drag a Ready-to-Go draft onto this card to post it now.'}
          </p>
        </div>
      ) : (
        <div
          onDragOver={onDragOver}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`rounded-xl border px-4 py-4 ${dragOver ? 'border-primary ring-2 ring-primary/20' : 'border-primary/40 bg-primary/[0.03]'}`}
        >
          <p className="text-[12px] font-semibold text-foreground/80 mb-2">Post this now?</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="w-10 h-10 shrink-0 rounded-md overflow-hidden border border-black/10 bg-warm-bg/40">
              {thumb ? (
                isVideo ? (
                  <video src={thumb} muted playsInline className="w-full h-full object-cover bg-black" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="w-full h-full object-cover" />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[8px] text-foreground/45 text-center px-0.5">No media</div>
              )}
            </div>

            <span className="text-[12px] text-foreground/80 truncate max-w-[160px]" title={draft.caption || '(no caption)'}>
              {draft.caption || '(no caption)'}
            </span>

            {availablePlatforms.length === 0 ? (
              <span className="text-[11px] text-red-700">no connected platforms</span>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {availablePlatforms.map((p) => (
                  <label key={p} className="inline-flex items-center gap-1 text-[11.5px] text-foreground/70 capitalize cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.has(p)}
                      onChange={() => togglePlatform(p)}
                      className="w-3.5 h-3.5 accent-primary"
                    />
                    {p}
                  </label>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => void submit()}
              disabled={submitting}
              className="rounded-lg bg-primary text-white px-3.5 py-1.5 text-[12.5px] font-semibold hover:bg-primary/90 disabled:opacity-40"
            >
              {submitting ? 'Posting…' : `Post now${selectedPlatforms.size > 0 ? ` to ${selectedPlatforms.size}` : ''}`}
            </button>

            <button
              type="button"
              onClick={() => { setDraft(null); setError(null); setSelectedPlatforms(new Set()); }}
              className="text-[10.5px] text-foreground/45 hover:text-foreground/80 uppercase tracking-wider"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
