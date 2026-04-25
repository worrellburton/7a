'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';

// Drag-and-drop editor for the public landing-page hero timeline.
// Left rail: every completed site_video (sorted newest first).
// Right rail: ordered timeline (the singleton landing_hero_timeline
// row's video_ids). Drop a card from the left into the timeline to
// add it; drag a card within the timeline to reorder; drag it back
// out (or hit the X) to remove. Save persists the order via
// /api/landing/hero — anything in the public marketing site that
// reads landing_hero_timeline picks up the new order on next render.

interface SiteVideo {
  id: string;
  source_image_id: string | null;
  filename: string | null;
  prompt: string | null;
  alt: string | null;
  seo_title: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  resolution: string | null;
  aspect_ratio: string | null;
  created_at: string;
}

interface SiteImage {
  id: string;
  public_url: string;
  alt: string | null;
}

function videoTitle(v: SiteVideo): string {
  return v.seo_title || v.prompt || v.filename || 'Untitled clip';
}

// One hero record as held in client state. The server returns this
// shape from /api/landing/heros (videos hydrated, ordered).
interface Hero {
  id: string;
  name: string;
  video_ids: string[];
  display_order: number;
  created_at: string;
  updated_at: string;
  videos: SiteVideo[];
}

// Mirror /app/video's thumbnail fallback chain: prefer the explicit
// thumbnail_url, fall back to the source image's public_url so older
// fal-generated rows that never got a thumbnail still render visually.
function videoPoster(v: SiteVideo, imagesById: Map<string, SiteImage>): string | null {
  if (v.thumbnail_url) return v.thumbnail_url;
  if (v.source_image_id) {
    const src = imagesById.get(v.source_image_id);
    if (src?.public_url) return src.public_url;
  }
  return null;
}

export default function LandingContent() {
  const { user, session } = useAuth();
  const [available, setAvailable] = useState<SiteVideo[]>([]);
  const [timeline, setTimeline] = useState<SiteVideo[]>([]);
  const [imagesById, setImagesById] = useState<Map<string, SiteImage>>(new Map());
  // Multi-hero state. The full list is held in `heros`; the editor
  // operates on the one keyed by `heroId`. Switching tabs does not
  // auto-save — phase-2 keeps the same explicit Save button. Each
  // hero's timeline is hydrated up-front (videos array on the row)
  // so a tab switch doesn't refetch.
  const [heros, setHeros] = useState<Hero[]>([]);
  const [heroId, setHeroId] = useState<string | null>(null);
  // Phase 4: when non-null, render an inline input on that tab.
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const dirtyRef = useRef(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  // Initial load — pull the available pool, the source-image gallery
  // (for thumbnail fallback), and every hero in parallel.
  useEffect(() => {
    if (!user || !session?.access_token) return;
    let cancelled = false;
    (async () => {
      const [pool, images, herosRes] = await Promise.all([
        supabase
          .from('site_videos')
          .select('id, source_image_id, filename, prompt, alt, seo_title, video_url, thumbnail_url, duration_seconds, resolution, aspect_ratio, created_at')
          .eq('status', 'completed')
          .not('video_url', 'is', null)
          .order('created_at', { ascending: false }),
        // Pull the source-image gallery so cards without a thumbnail
        // can fall back to the still that generated them — same trick
        // /app/video uses.
        supabase
          .from('site_images')
          .select('id, public_url, alt'),
        fetch('/api/landing/heros', {
          credentials: 'include',
          cache: 'no-store',
          headers: { Authorization: `Bearer ${session.access_token}` },
        }).then((r) => (r.ok ? r.json() : null)),
      ]);
      if (cancelled) return;
      const all = ((pool.data ?? []) as SiteVideo[]).filter((v) => !!v.video_url);
      setAvailable(all);
      const imgMap = new Map<string, SiteImage>();
      for (const i of (images.data ?? []) as SiteImage[]) imgMap.set(i.id, i);
      setImagesById(imgMap);
      // /api/landing/heros returns heros in display_order. We seed
      // local state with the full list and select the first one as
      // active — the tab strip (phase 2) lets the user switch.
      const list = (herosRes?.heros as Hero[] | undefined) ?? [];
      setHeros(list);
      const active = list[0] ?? null;
      setHeroId(active?.id ?? null);
      setTimeline(active?.videos ?? []);
      setSavedAt(active?.updated_at ?? null);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user, session?.access_token]);

  // Available rail hides anything currently in the timeline so a
  // single clip can't be dropped into the hero twice.
  const timelineIds = useMemo(() => new Set(timeline.map((v) => v.id)), [timeline]);
  const visibleAvailable = useMemo(
    () => available.filter((v) => !timelineIds.has(v.id)),
    [available, timelineIds],
  );

  function addToTimeline(id: string, beforeIndex?: number) {
    const v = available.find((x) => x.id === id);
    if (!v) return;
    if (timelineIds.has(id)) return;
    setTimeline((prev) => {
      const next = prev.slice();
      if (typeof beforeIndex === 'number') {
        next.splice(Math.max(0, Math.min(prev.length, beforeIndex)), 0, v);
      } else {
        next.push(v);
      }
      return next;
    });
    dirtyRef.current = true;
  }

  function reorderTimeline(fromId: string, toIndex: number) {
    setTimeline((prev) => {
      const fromIdx = prev.findIndex((x) => x.id === fromId);
      if (fromIdx < 0) return prev;
      const next = prev.slice();
      const [moved] = next.splice(fromIdx, 1);
      // Adjust target if we removed an item before it.
      const adjusted = fromIdx < toIndex ? toIndex - 1 : toIndex;
      next.splice(Math.max(0, Math.min(next.length, adjusted)), 0, moved);
      return next;
    });
    dirtyRef.current = true;
  }

  function removeFromTimeline(id: string) {
    setTimeline((prev) => prev.filter((v) => v.id !== id));
    dirtyRef.current = true;
  }

  async function save() {
    if (!session?.access_token) return;
    if (!heroId) {
      showToast('No hero loaded yet — refresh and try again.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/landing/heros/${heroId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ video_ids: timeline.map((v) => v.id) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(json?.error || `Save failed (${res.status})`);
        return;
      }
      const updatedHero = json?.hero as Hero | undefined;
      if (updatedHero) {
        // Mirror the saved hero into the local list so a tab switch
        // away and back doesn't show stale data.
        setHeros((prev) => prev.map((h) => (h.id === updatedHero.id ? { ...updatedHero, videos: timeline } : h)));
        setSavedAt(updatedHero.updated_at);
      } else {
        setSavedAt(new Date().toISOString());
      }
      dirtyRef.current = false;
      showToast('Hero timeline saved');
    } finally {
      setSaving(false);
    }
  }

  function selectHero(nextId: string) {
    if (nextId === heroId) return;
    if (dirtyRef.current) {
      const ok = window.confirm('You have unsaved changes on this hero. Switch anyway? Your edits will be lost.');
      if (!ok) return;
    }
    const next = heros.find((h) => h.id === nextId);
    if (!next) return;
    setHeroId(next.id);
    setTimeline(next.videos);
    setSavedAt(next.updated_at);
    dirtyRef.current = false;
  }

  async function renameHero(id: string, nextName: string) {
    if (!session?.access_token) return;
    const trimmed = nextName.trim();
    if (!trimmed) {
      showToast('Hero name cannot be empty.');
      return;
    }
    // Optimistic update so the tab snaps to the new name immediately.
    const prevHeros = heros;
    setHeros((prev) => prev.map((h) => (h.id === id ? { ...h, name: trimmed } : h)));
    const res = await fetch(`/api/landing/heros/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ name: trimmed }),
    });
    if (!res.ok) {
      // Roll back on failure so state matches the server.
      setHeros(prevHeros);
      const json = await res.json().catch(() => ({}));
      showToast(json?.error || `Rename failed (${res.status})`);
      return;
    }
    const json = await res.json().catch(() => ({}));
    const updated = json?.hero as Hero | undefined;
    if (updated) {
      setHeros((prev) => prev.map((h) => (h.id === updated.id ? { ...updated, videos: h.videos } : h)));
      if (id === heroId) setSavedAt(updated.updated_at);
    }
    showToast('Renamed');
  }

  async function createHero() {
    if (!session?.access_token) return;
    if (dirtyRef.current) {
      const ok = window.confirm('You have unsaved changes on this hero. Create a new hero anyway? Your edits will be lost.');
      if (!ok) return;
    }
    const defaultName = `Hero ${heros.length + 1}`;
    const name = window.prompt('Name this hero (you can rename later):', defaultName);
    if (name === null) return; // user hit cancel
    const trimmed = name.trim();
    const res = await fetch('/api/landing/heros', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ name: trimmed || defaultName }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(json?.error || `Create failed (${res.status})`);
      return;
    }
    const created = json?.hero as Hero | undefined;
    if (!created) {
      showToast('Create returned no hero');
      return;
    }
    // Append to local state and switch to it.
    setHeros((prev) => [...prev, created]);
    setHeroId(created.id);
    setTimeline(created.videos);
    setSavedAt(created.updated_at);
    dirtyRef.current = false;
    showToast(`Created "${created.name}"`);
  }

  if (!user) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-10" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-1">Marketing &amp; Admissions</p>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Landing
          </h1>
          <p className="mt-1 text-sm text-foreground/60 max-w-2xl">
            Build the timeline of clips the public landing-page hero will
            play. Drag a video from the left into the timeline; drag inside
            the timeline to reorder; drop it back to remove.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && (
            <span className="text-[11px] text-foreground/45">
              Saved {new Date(savedAt).toLocaleString()}
            </span>
          )}
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            disabled={timeline.length === 0}
            title={timeline.length === 0 ? 'Add at least one clip to preview' : 'Play the timeline like the public hero will'}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white text-foreground border border-black/10 hover:border-primary/40 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
            Preview
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !loaded}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white shadow-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {saving ? 'Saving…' : 'Save timeline'}
          </button>
        </div>
      </header>

      {/* Hero tab strip. Phase 3 adds the trailing + New button.
          Phase 4 introduces inline rename, phase 5 inline delete. */}
      {loaded && (
        <div className="mb-5 -mx-1 flex items-center gap-1 overflow-x-auto border-b border-black/10">
          {heros.map((h) => {
            const isActive = h.id === heroId;
            const isRenaming = h.id === renamingId;
            const count = h.videos.length;
            if (isRenaming) {
              return (
                <RenameInput
                  key={h.id}
                  initial={h.name}
                  onCommit={(next) => {
                    setRenamingId(null);
                    if (next !== h.name) void renameHero(h.id, next);
                  }}
                  onCancel={() => setRenamingId(null)}
                />
              );
            }
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => selectHero(h.id)}
                onDoubleClick={() => {
                  // Double-clicking puts the tab into rename mode.
                  // If it wasn't already active, also select it so
                  // editing operates on the right hero.
                  if (h.id !== heroId) selectHero(h.id);
                  setRenamingId(h.id);
                }}
                title={`${h.name} · ${count} clip${count === 1 ? '' : 's'} · double-click to rename`}
                className={`relative px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  isActive
                    ? 'text-primary border-primary'
                    : 'text-foreground/60 border-transparent hover:text-foreground hover:border-foreground/20'
                }`}
              >
                {h.name}
                <span className={`ml-2 text-[10px] tabular-nums ${isActive ? 'text-primary/70' : 'text-foreground/40'}`}>
                  {count}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={createHero}
            title="Create a new hero timeline"
            className="ml-1 px-3 py-2.5 text-sm font-semibold text-foreground/55 hover:text-primary whitespace-nowrap inline-flex items-center gap-1 border-b-2 border-transparent hover:border-primary/40 -mb-px transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New hero
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-[2fr_3fr] gap-6">
        {/* Available pool */}
        <section className="rounded-2xl border border-black/5 bg-white p-4 lg:p-5 min-h-[300px]">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Available videos</h2>
            <span className="text-[11px] text-foreground/40">{visibleAvailable.length}</span>
          </div>
          {!loaded ? (
            <p className="text-sm text-foreground/50 italic">Loading…</p>
          ) : visibleAvailable.length === 0 ? (
            <p className="text-sm text-foreground/50 italic">
              Every playable clip is already in the timeline. Drop one back to add another, or generate / upload more on{' '}
              <a className="underline hover:text-primary" href="/app/video">/app/video</a>.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {visibleAvailable.map((v) => (
                <PoolCard
                  key={v.id}
                  v={v}
                  imagesById={imagesById}
                  onAdd={() => addToTimeline(v.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Timeline */}
        <section
          className="rounded-2xl border border-black/5 bg-warm-bg/40 p-4 lg:p-5 min-h-[300px] transition-colors"
          onDragOver={(e) => {
            // Allow dropping new items onto the empty area / between cards.
            const types = Array.from(e.dataTransfer.types || []);
            if (types.includes('text/x-video-id')) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }
          }}
          onDrop={(e) => {
            const id = e.dataTransfer.getData('text/x-video-id');
            const fromTimeline = e.dataTransfer.getData('text/x-from-timeline') === '1';
            if (!id) return;
            e.preventDefault();
            if (fromTimeline) {
              reorderTimeline(id, timeline.length);
            } else {
              addToTimeline(id);
            }
          }}
        >
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Hero timeline</h2>
            <span className="text-[11px] text-foreground/40">{timeline.length} clip{timeline.length === 1 ? '' : 's'}</span>
          </div>
          {timeline.length === 0 ? (
            <p className="text-sm text-foreground/50 italic">
              Drop a video card here to start the timeline.
            </p>
          ) : (
            <ol className="space-y-2">
              {timeline.map((v, i) => (
                <TimelineRow
                  key={v.id}
                  index={i}
                  v={v}
                  imagesById={imagesById}
                  onRemove={() => removeFromTimeline(v.id)}
                  onDropAt={(fromId, fromTimeline) => {
                    if (fromTimeline) reorderTimeline(fromId, i);
                    else addToTimeline(fromId, i);
                  }}
                />
              ))}
              <DropTail
                onDropAt={(fromId, fromTimeline) => {
                  if (fromTimeline) reorderTimeline(fromId, timeline.length);
                  else addToTimeline(fromId);
                }}
              />
            </ol>
          )}
        </section>
      </div>

      {previewOpen && timeline.length > 0 && (
        <PreviewModal
          clips={timeline}
          imagesById={imagesById}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-full bg-foreground text-white text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function PreviewModal({
  clips,
  imagesById,
  onClose,
}: {
  clips: SiteVideo[];
  imagesById: Map<string, SiteImage>;
  onClose: () => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const [loop, setLoop] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // ESC to close, like a normal lightbox.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Re-trigger play() whenever the source URL changes — some browsers
  // hold the video paused after a src swap until told otherwise.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.load();
    void el.play().catch(() => { /* autoplay blocked, user can click */ });
  }, [activeIdx]);

  function next() {
    if (activeIdx < clips.length - 1) {
      setActiveIdx(activeIdx + 1);
    } else if (loop) {
      setActiveIdx(0);
    }
  }
  function prev() {
    if (activeIdx > 0) setActiveIdx(activeIdx - 1);
    else if (loop) setActiveIdx(clips.length - 1);
  }

  const active = clips[activeIdx];
  const poster = videoPoster(active, imagesById) || undefined;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Hero timeline preview"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-5xl bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-black/40 text-white text-xs">
          <div className="flex items-center gap-2 font-mono tabular-nums">
            <span className="text-white/60">{(activeIdx + 1).toString().padStart(2, '0')} / {clips.length.toString().padStart(2, '0')}</span>
            <span className="text-white/40">·</span>
            <span className="truncate max-w-[40ch]">{videoTitle(active)}</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={loop}
                onChange={(e) => setLoop(e.target.checked)}
                className="accent-primary"
              />
              <span className="text-[11px] text-white/80">Loop</span>
            </label>
            <button
              type="button"
              onClick={() => setMuted((v) => !v)}
              className="text-[11px] text-white/80 hover:text-white"
              title={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? '🔇 Muted' : '🔊 On'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="text-white/70 hover:text-white text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Player */}
        <div className="relative bg-black aspect-video flex items-center justify-center">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            key={active.id}
            src={active.video_url ?? undefined}
            poster={poster}
            autoPlay
            muted={muted}
            playsInline
            controls
            onEnded={next}
            className="w-full h-full object-contain bg-black"
          />
          {/* Prev / next clip arrows. Only render when multi-clip so a
              single-clip preview isn't visually noisy. */}
          {clips.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous clip"
                className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/55 text-white hover:bg-black/75"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next clip"
                className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/55 text-white hover:bg-black/75"
              >
                ›
              </button>
            </>
          )}
        </div>

        {/* Strip — small thumbs of every clip in order, click to jump. */}
        <div className="bg-black/40 px-3 py-2 overflow-x-auto">
          <div className="flex items-center gap-2">
            {clips.map((c, i) => {
              const tPoster = videoPoster(c, imagesById);
              const isActive = i === activeIdx;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  className={`shrink-0 rounded-md overflow-hidden border-2 transition ${
                    isActive ? 'border-primary' : 'border-transparent hover:border-white/30'
                  }`}
                  title={`${(i + 1).toString().padStart(2, '0')} · ${videoTitle(c)}`}
                >
                  <div className="w-20 aspect-video bg-black/60 flex items-center justify-center">
                    {tPoster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={tPoster} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <span className="text-[9px] text-white/40 uppercase tracking-wider">No thumb</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline input that takes the place of a hero tab while it's being
// renamed. Auto-focuses, commits on blur or Enter, cancels on Esc.
function RenameInput({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (next: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.select();
  }, []);
  return (
    <input
      ref={ref}
      type="text"
      value={value}
      maxLength={80}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onCommit(value);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={() => onCommit(value)}
      className="px-3 py-2 text-sm font-semibold bg-white border-2 border-primary rounded-md outline-none -mb-px"
      style={{ minWidth: 120, maxWidth: 240 }}
    />
  );
}

function PoolCard({
  v,
  imagesById,
  onAdd,
}: {
  v: SiteVideo;
  imagesById: Map<string, SiteImage>;
  onAdd: () => void;
}) {
  const title = videoTitle(v);
  const poster = videoPoster(v, imagesById);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/x-video-id', v.id);
        e.dataTransfer.setData('text/x-from-timeline', '0');
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDoubleClick={onAdd}
      title="Drag to timeline, or double-click to append"
      className="group cursor-grab active:cursor-grabbing rounded-xl bg-white border border-black/5 hover:border-primary/40 hover:shadow-md transition overflow-hidden"
    >
      <div className="aspect-video w-full bg-warm-bg flex items-center justify-center overflow-hidden">
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt={v.alt || title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-[10px] text-foreground/40 uppercase tracking-wider">No thumb</span>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-[12px] font-medium text-foreground truncate" title={title}>{title}</p>
        <p className="text-[10px] text-foreground/45 mt-0.5">
          {v.duration_seconds ? `${v.duration_seconds}s` : '—'} · {v.resolution || '—'}
        </p>
      </div>
    </div>
  );
}

function TimelineRow({
  index,
  v,
  imagesById,
  onRemove,
  onDropAt,
}: {
  index: number;
  v: SiteVideo;
  imagesById: Map<string, SiteImage>;
  onRemove: () => void;
  onDropAt: (fromId: string, fromTimeline: boolean) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const title = videoTitle(v);
  const poster = videoPoster(v, imagesById);
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/x-video-id', v.id);
        e.dataTransfer.setData('text/x-from-timeline', '1');
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(e) => {
        const types = Array.from(e.dataTransfer.types || []);
        if (types.includes('text/x-video-id')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        const id = e.dataTransfer.getData('text/x-video-id');
        const fromTimeline = e.dataTransfer.getData('text/x-from-timeline') === '1';
        setDragOver(false);
        if (!id || id === v.id) return;
        e.preventDefault();
        e.stopPropagation();
        onDropAt(id, fromTimeline);
      }}
      className={`flex items-center gap-3 rounded-xl bg-white border px-2.5 py-2 cursor-grab active:cursor-grabbing transition ${
        dragOver ? 'border-primary/70 ring-1 ring-primary/30' : 'border-black/5'
      }`}
    >
      <span className="text-[10px] font-mono text-foreground/40 w-6 text-right tabular-nums">
        {(index + 1).toString().padStart(2, '0')}
      </span>
      <div className="w-24 aspect-video shrink-0 bg-warm-bg rounded-md overflow-hidden">
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate" title={title}>{title}</p>
        <p className="text-[10px] text-foreground/45 mt-0.5">
          {v.duration_seconds ? `${v.duration_seconds}s` : '—'} · {v.resolution || '—'} · {v.aspect_ratio || '—'}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        title="Remove from timeline"
        aria-label="Remove from timeline"
        className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md border border-black/10 text-foreground/55 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
        </svg>
      </button>
    </li>
  );
}

function DropTail({ onDropAt }: { onDropAt: (fromId: string, fromTimeline: boolean) => void }) {
  const [active, setActive] = useState(false);
  return (
    <li
      onDragOver={(e) => {
        const types = Array.from(e.dataTransfer.types || []);
        if (types.includes('text/x-video-id')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setActive(true);
        }
      }}
      onDragLeave={() => setActive(false)}
      onDrop={(e) => {
        const id = e.dataTransfer.getData('text/x-video-id');
        const fromTimeline = e.dataTransfer.getData('text/x-from-timeline') === '1';
        setActive(false);
        if (!id) return;
        e.preventDefault();
        onDropAt(id, fromTimeline);
      }}
      className={`rounded-xl border-2 border-dashed text-center text-[11px] py-3 transition ${
        active ? 'border-primary/60 text-primary bg-primary/5' : 'border-black/10 text-foreground/40'
      }`}
    >
      Drop to append
    </li>
  );
}
