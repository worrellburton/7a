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

/* ── Ready drafts card (draggable source) ────────────────────── */

// Exported so the Post tab + Schedule tab can render Ready-to-Go as
// its own card. Each tile is draggable and carries the full draft on
// the dataTransfer so a drop target can schedule it directly.
export function ReadyToGoCard({ drafts }: { drafts: ReadyDraft[] }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white px-4 py-4 lg:px-5 lg:py-5">
      <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Ready to go · {drafts.length}</h2>
          <p className="text-[11px] text-foreground/45 mt-0.5">
            Drag a draft down onto the Schedule card, then pick the exact date and time you want it to post.
          </p>
        </div>
      </div>
      {drafts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/15 bg-warm-bg/30 px-5 py-8 text-center">
          <p className="text-[12.5px] text-foreground/55 max-w-md mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
            Mark drafts as <em>Ready to go</em> in Creative → Draft to land them here.
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
  const [okMsg, setOkMsg] = useState<string | null>(null);

  // Networks to post to: the draft's chosen platforms that are also
  // connected. If the draft carries no platform assignment at all we
  // fall back to every connected account so it still goes somewhere.
  const assigned = draft?.platforms ?? [];
  const targets = assigned.length > 0
    ? assigned.filter((p) => connectedPlatforms.includes(p))
    : connectedPlatforms;

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
      setDraft(JSON.parse(raw) as ReadyDraft);
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
    if (targets.length === 0) {
      setError(assigned.length > 0
        ? "None of this draft's platforms are connected yet — connect them under Overview."
        : 'Connect at least one social account before scheduling.');
      return;
    }
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
        return;
      }
      setOkMsg(`Scheduled for ${at.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.`);
      setDraft(null);
      setWhen('');
      onScheduled();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }, [draft, when, targets, assigned.length, session?.access_token, onScheduled]);

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
      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800 mb-3" role="alert">
          {error}
        </p>
      )}

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
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-black/10 bg-warm-bg/40">
              {thumb ? (
                isVideo ? (
                  <video src={thumb} muted playsInline className="w-full h-full object-cover bg-black" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="w-full h-full object-cover" />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[9px] text-foreground/45 text-center px-1">No media</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-foreground/85 line-clamp-2 leading-snug" style={{ fontFamily: 'var(--font-body)' }}>
                {draft.caption || '(no caption)'}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-foreground/45">Posting to</span>
                {targets.length === 0 ? (
                  <span className="text-[11px] text-red-700">no connected platforms</span>
                ) : (
                  targets.map((p) => (
                    <span key={p} className="inline-block px-1.5 py-0.5 rounded border border-black/10 bg-warm-bg/50 text-[10.5px] text-foreground/70 capitalize">
                      {p}
                    </span>
                  ))
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setDraft(null); setWhen(''); setError(null); }}
              className="shrink-0 text-[10.5px] text-foreground/45 hover:text-foreground/80 uppercase tracking-wider"
            >
              Clear
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-foreground/55">Date &amp; time</span>
              <input
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                className="mt-1 block rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={submitting || !when}
              className="rounded-lg bg-primary text-white px-4 py-2 text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-40"
            >
              {submitting ? 'Scheduling…' : 'Schedule post'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
