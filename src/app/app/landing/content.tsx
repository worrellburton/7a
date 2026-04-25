'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';

// Drag-and-drop editor for the public landing-page hero timelines.
//
// Layout:
//   Header                      title + Save
//   Hero tabs                   one per landing_heros row · drag to reorder ·
//                               double-click to rename · × to delete · + New
//   Preview  |  Available       inline auto-advancing player + searchable pool
//   Hero timeline               horizontal strip of dragged-in clips
//
// Reads + writes go through /api/landing/heros (list + create) and
// /api/landing/heros/[id] (patch name / video_ids / display_order +
// delete). The public marketing site reads landing_heros directly
// (anon RLS allows SELECT) by display_order.

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
  // Phase 7: the preview player is now inline. Tracks which clip
  // the player is currently on so we can advance through the
  // timeline.
  const [previewIdx, setPreviewIdx] = useState(0);
  const [previewMuted, setPreviewMuted] = useState(true);
  const [poolFilter, setPoolFilter] = useState('');
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
  const visibleAvailable = useMemo(() => {
    const q = poolFilter.trim().toLowerCase();
    return available.filter((v) => {
      if (timelineIds.has(v.id)) return false;
      if (!q) return true;
      // Match against any of the labels we render — title, prompt,
      // filename, alt — so the user can search by whatever comes to
      // mind.
      const haystack = [v.seo_title, v.prompt, v.filename, v.alt]
        .filter((s): s is string => !!s)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [available, timelineIds, poolFilter]);

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
    setPreviewIdx(0); // Restart the preview on the new hero's first clip.
    dirtyRef.current = false;
  }

  // Keep previewIdx in bounds when the timeline shrinks (e.g. user
  // removes the clip the player was on).
  useEffect(() => {
    if (timeline.length === 0 && previewIdx !== 0) setPreviewIdx(0);
    else if (previewIdx >= timeline.length) setPreviewIdx(0);
  }, [timeline.length, previewIdx]);

  async function reorderHeroes(fromId: string, beforeId: string | null) {
    if (!session?.access_token) return;
    if (fromId === beforeId) return;
    // Compute the new local order, then write display_order back to
    // every affected row (1-indexed contiguous integers so future
    // inserts have somewhere to slot).
    const fromIdx = heros.findIndex((h) => h.id === fromId);
    if (fromIdx < 0) return;
    const without = heros.filter((h) => h.id !== fromId);
    const targetIdx = beforeId === null ? without.length : without.findIndex((h) => h.id === beforeId);
    if (targetIdx < 0) return;
    const next = [...without.slice(0, targetIdx), heros[fromIdx], ...without.slice(targetIdx)];
    if (next.every((h, i) => h.id === heros[i]?.id)) return; // no-op
    setHeros(next.map((h, i) => ({ ...h, display_order: i })));
    // Fire-and-forget per-row PATCHes; concurrent updates are safe
    // since each row is a separate id and the trigger touches
    // updated_at independently.
    await Promise.all(
      next.map((h, i) =>
        h.display_order === i
          ? Promise.resolve()
          : fetch(`/api/landing/heros/${h.id}`, {
              method: 'PATCH',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ display_order: i }),
            }),
      ),
    );
  }

  async function deleteHero(id: string) {
    if (!session?.access_token) return;
    if (heros.length <= 1) {
      showToast('You need at least one hero — create another, then delete this one.');
      return;
    }
    const target = heros.find((h) => h.id === id);
    if (!target) return;
    const ok = window.confirm(
      `Delete "${target.name}"? This drops it from the landing page on the next save. Cannot be undone.`,
    );
    if (!ok) return;
    const res = await fetch(`/api/landing/heros/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      showToast(json?.error || `Delete failed (${res.status})`);
      return;
    }
    const remaining = heros.filter((h) => h.id !== id);
    setHeros(remaining);
    // If the active hero was the one deleted, fall back to the first
    // remaining one — we already verified there's at least one left.
    if (id === heroId) {
      const next = remaining[0];
      setHeroId(next?.id ?? null);
      setTimeline(next?.videos ?? []);
      setSavedAt(next?.updated_at ?? null);
      dirtyRef.current = false;
    }
    showToast('Hero deleted');
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
              <div
                key={h.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/x-hero-id', h.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  const types = Array.from(e.dataTransfer.types || []);
                  if (types.includes('text/x-hero-id')) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }
                }}
                onDrop={(e) => {
                  const fromId = e.dataTransfer.getData('text/x-hero-id');
                  if (!fromId || fromId === h.id) return;
                  e.preventDefault();
                  e.stopPropagation();
                  void reorderHeroes(fromId, h.id);
                }}
                className={`group relative inline-flex items-center border-b-2 -mb-px transition-colors ${
                  isActive ? 'border-primary' : 'border-transparent hover:border-foreground/20'
                }`}
              >
                <button
                  type="button"
                  onClick={() => selectHero(h.id)}
                  onDoubleClick={() => {
                    if (h.id !== heroId) selectHero(h.id);
                    setRenamingId(h.id);
                  }}
                  title={`${h.name} · ${count} clip${count === 1 ? '' : 's'} · drag to reorder · double-click to rename`}
                  className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors cursor-grab active:cursor-grabbing ${
                    isActive ? 'text-primary' : 'text-foreground/60 group-hover:text-foreground'
                  }`}
                >
                  {h.name}
                  <span className={`ml-2 text-[10px] tabular-nums ${isActive ? 'text-primary/70' : 'text-foreground/40'}`}>
                    {count}
                  </span>
                </button>
                {heros.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); void deleteHero(h.id); }}
                    aria-label={`Delete ${h.name}`}
                    title={`Delete "${h.name}"`}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 mr-1.5 inline-flex items-center justify-center w-5 h-5 rounded-md text-foreground/40 hover:text-red-600 hover:bg-red-50 transition-opacity"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M6 6l12 12M6 18L18 6" />
                    </svg>
                  </button>
                )}
              </div>
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

      {/* Top: inline preview + available pool side-by-side. */}
      <div className="grid lg:grid-cols-[3fr_2fr] gap-5 mb-5 items-start">
        <TimelinePreview
          clips={timeline}
          activeIdx={previewIdx}
          setActiveIdx={setPreviewIdx}
          imagesById={imagesById}
          muted={previewMuted}
          setMuted={setPreviewMuted}
        />

        <section className="rounded-2xl border border-black/5 bg-white p-4 lg:p-5 min-h-[280px] max-h-[460px] flex flex-col">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-sm font-semibold text-foreground">Available videos</h2>
            <span className="text-[11px] text-foreground/40">{visibleAvailable.length}</span>
          </div>
          <div className="relative mb-3">
            <input
              type="search"
              value={poolFilter}
              onChange={(e) => setPoolFilter(e.target.value)}
              placeholder="Search title, prompt, filename…"
              className="w-full text-sm pl-8 pr-3 py-2 rounded-lg bg-warm-bg/40 border border-black/5 focus:bg-white focus:border-primary/40 focus:outline-none"
              style={{ fontFamily: 'var(--font-body)' }}
            />
            <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <div className="overflow-y-auto -mx-1 px-1 flex-1 min-h-0">
            {!loaded ? (
              <p className="text-sm text-foreground/50 italic">Loading…</p>
            ) : visibleAvailable.length === 0 ? (
              <p className="text-sm text-foreground/50 italic">
                {poolFilter
                  ? 'No matches. Clear the search to see everything.'
                  : <>Every playable clip is already in the timeline. Drop one back to add another, or generate / upload more on{' '}
                    <a className="underline hover:text-primary" href="/app/video">/app/video</a>.</>}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
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
          </div>
        </section>
      </div>

      {/* Timeline — horizontal strip at the bottom. Cards flow left
          to right; reordering is left/right; "Drop to append" lives
          at the right end. The container stretches to a single row,
          scrolling horizontally if the timeline outgrows the
          viewport. */}
      <section
        className="rounded-2xl border border-black/5 bg-warm-bg/40 p-4 lg:p-5 min-h-[200px] transition-colors"
        onDragOver={(e) => {
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
          <ol className="flex items-stretch gap-3 overflow-x-auto pb-1">
            {timeline.map((v, i) => (
              <TimelineCard
                key={v.id}
                index={i}
                v={v}
                imagesById={imagesById}
                onRemove={() => removeFromTimeline(v.id)}
                onDropAt={(fromId, fromTimeline) => {
                  if (fromTimeline) reorderTimeline(fromId, i);
                  else addToTimeline(fromId, i);
                }}
                onNudge={(delta) => {
                  // ←/→ on a focused tile. Clamp to the row bounds.
                  const target = Math.max(0, Math.min(timeline.length - 1, i + delta));
                  if (target === i) return;
                  // reorderTimeline takes the destination slot before
                  // it removes the source, so for a right-nudge we
                  // need target+1 to land past the neighbor.
                  reorderTimeline(v.id, delta > 0 ? target + 1 : target);
                }}
              />
            ))}
            <DropTailHorizontal
              onDropAt={(fromId, fromTimeline) => {
                if (fromTimeline) reorderTimeline(fromId, timeline.length);
                else addToTimeline(fromId);
              }}
            />
          </ol>
        )}
      </section>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-full bg-foreground text-white text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

// Inline timeline preview. Lives in the editor (not a modal) so the
// preview is always visible while the user is dragging clips around.
// Auto-advances through the clips, loops at the end. The active
// index is owned by the parent so a tab switch can reset it cleanly.
function TimelinePreview({
  clips,
  activeIdx,
  setActiveIdx,
  imagesById,
  muted,
  setMuted,
}: {
  clips: SiteVideo[];
  activeIdx: number;
  setActiveIdx: (i: number) => void;
  imagesById: Map<string, SiteImage>;
  muted: boolean;
  setMuted: (m: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Re-load + play whenever the active source URL changes — some
  // browsers hold the video paused after a src swap until prodded.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.load();
    void el.play().catch(() => { /* autoplay blocked is fine */ });
  }, [activeIdx]);

  if (clips.length === 0) {
    return (
      <section className="rounded-2xl border border-black/5 bg-black/90 text-white/70 aspect-video flex items-center justify-center text-sm">
        Drop a clip into the timeline to preview the hero.
      </section>
    );
  }

  const safeIdx = Math.min(Math.max(0, activeIdx), clips.length - 1);
  const active = clips[safeIdx];
  const poster = videoPoster(active, imagesById) || undefined;

  return (
    <section className="rounded-2xl bg-black overflow-hidden shadow-sm flex flex-col">
      <div className="relative aspect-video bg-black">
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
          onEnded={() => setActiveIdx((safeIdx + 1) % clips.length)}
          className="w-full h-full object-contain bg-black"
        />
        <div className="pointer-events-none absolute top-2 left-2 right-2 flex items-center justify-between text-white text-[11px] font-mono tabular-nums">
          <span className="px-2 py-0.5 rounded-full bg-black/55">
            {(safeIdx + 1).toString().padStart(2, '0')} / {clips.length.toString().padStart(2, '0')} · {videoTitle(active)}
          </span>
          <button
            type="button"
            onClick={() => setMuted(!muted)}
            title={muted ? 'Unmute' : 'Mute'}
            className="pointer-events-auto px-2 py-0.5 rounded-full bg-black/55 hover:bg-black/75 transition"
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>
    </section>
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

function TimelineCard({
  index,
  v,
  imagesById,
  onRemove,
  onDropAt,
  onNudge,
}: {
  index: number;
  v: SiteVideo;
  imagesById: Map<string, SiteImage>;
  onRemove: () => void;
  onDropAt: (fromId: string, fromTimeline: boolean) => void;
  onNudge: (delta: -1 | 1) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const title = videoTitle(v);
  const poster = videoPoster(v, imagesById);
  return (
    <li
      draggable
      tabIndex={0}
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
      onKeyDown={(e) => {
        // ←/→ on a focused tile nudges it one slot in either
        // direction. Skips when a modifier key is held so it
        // doesn't fight a screen reader. Holding shift jumps to
        // the start/end.
        if (e.altKey || e.metaKey || e.ctrlKey) return;
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          onNudge(-1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          onNudge(1);
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          onRemove();
        }
      }}
      className={`group relative shrink-0 w-44 rounded-xl bg-white border overflow-hidden cursor-grab active:cursor-grabbing transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        dragOver ? 'border-primary/70' : 'border-black/5'
      }`}
    >
      {dragOver && (
        // Drop-indicator bar on the leading edge — clearer than a
        // full-card ring when several tiles are tightly packed.
        <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl" />
      )}
      <div className="relative aspect-video bg-warm-bg overflow-hidden">
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[9px] text-foreground/40 uppercase tracking-wider">No thumb</span>
          </div>
        )}
        <span className="absolute top-1.5 left-1.5 inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-black/65 text-white text-[10px] font-bold tabular-nums">
          {(index + 1).toString().padStart(2, '0')}
        </span>
        <button
          type="button"
          onClick={onRemove}
          title="Remove from timeline"
          aria-label="Remove from timeline"
          className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-6 h-6 rounded-md bg-black/55 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
          </svg>
        </button>
      </div>
      <div className="p-2">
        <p className="text-[12px] font-medium text-foreground truncate" title={title}>{title}</p>
        <p className="text-[10px] text-foreground/45 mt-0.5 truncate">
          {v.duration_seconds ? `${v.duration_seconds}s` : '—'} · {v.resolution || '—'}
        </p>
      </div>
    </li>
  );
}

function DropTailHorizontal({ onDropAt }: { onDropAt: (fromId: string, fromTimeline: boolean) => void }) {
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
      className={`shrink-0 w-44 aspect-video rounded-xl border-2 border-dashed flex items-center justify-center text-[11px] transition ${
        active ? 'border-primary/60 text-primary bg-primary/5' : 'border-black/10 text-foreground/40'
      }`}
    >
      Drop to append
    </li>
  );
}
