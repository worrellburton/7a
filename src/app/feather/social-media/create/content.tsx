'use client';

// Create Post page — landing point for the Build → Continue
// hand-off. Hydrates from the same sessionStorage staging key that
// the old Library → AI path used, then asks the marketer to:
//
//   1. Confirm / edit the caption.
//   2. Pick which networks the post is going to.
//   3. Fill an upload slot for every deliverable that those
//      networks need (one per spec / aspect ratio). Hovering a
//      slot reveals a "Pick from library" overlay; the
//      first staged media URL is also one click away via
//      "Use staged media." A media-URL textbox is the final
//      fallback for assets that live outside the library.
//   4. Hit "Save and ready to go" — that commits a SavedDraft
//      with ready: true + the captured per-deliverable URLs and
//      routes back to Creative > Ready to go.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import { PLATFORM_SPECS, type MediaSpec, type VideoSpec } from '../platform-specs';
import { PlatformIcon, type PlatformId } from '../PlatformIcon';
import { readSavedDrafts, writeSavedDrafts, type SavedDraft } from '../saved-drafts';

const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  twitter: 'X (Twitter)',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  pinterest: 'Pinterest',
  gmb: 'Google Business',
  reddit: 'Reddit',
  threads: 'Threads',
  bluesky: 'Bluesky',
};

const ALL_PLATFORM_IDS: PlatformId[] = [
  'facebook', 'instagram', 'linkedin', 'twitter', 'tiktok',
  'youtube', 'pinterest', 'gmb', 'reddit', 'threads', 'bluesky',
];

// Mirrors the staging contract pushed by CreativeLibraryPanel.continueToAi.
const STAGING_KEY = 'social_media_creative_staging_v1';

// Surface = the social-network "place" a deliverable goes. Derived
// off the deliverable label because PLATFORM_SPECS doesn't carry it
// natively. Stays string-typed so adding a new label / surface
// doesn't require updating a union. The Deliverables card groups
// each platform's deliverable slots by surface so the user can
// checkbox which surfaces they actually want to produce.
type DeliverableSurface =
  | 'post'
  | 'story'
  | 'reel'
  | 'short'
  | 'long-form'
  | 'link'
  | 'pin'
  | 'thumbnail'
  | 'document';

const SURFACE_LABEL: Record<DeliverableSurface, string> = {
  post: 'Post',
  story: 'Story',
  reel: 'Reel',
  short: 'Short',
  'long-form': 'Long-form',
  link: 'Link preview',
  pin: 'Pin',
  thumbnail: 'Thumbnail',
  document: 'Document',
};

function inferSurface(label: string): DeliverableSurface {
  const l = label.toLowerCase();
  // Order matters — earlier matches win. 'Story / Reel' matches
  // 'story' first, which is the dominant Instagram use case for
  // that combined 9:16 slot.
  if (l.includes('story')) return 'story';
  if (l.includes('reel')) return 'reel';
  if (l.includes('short')) return 'short';
  if (l.includes('long-form')) return 'long-form';
  if (l.includes('thumbnail')) return 'thumbnail';
  if (l.includes('link preview')) return 'link';
  if (l.includes('pin')) return 'pin';
  if (l.includes('document') || l.includes('pdf')) return 'document';
  return 'post';
}

interface DeliverableRow {
  key: string;            // "${platform}|${label}"
  platform: PlatformId;
  label: string;          // "Feed (1:1)"
  ratio: string;          // "1:1"
  size: string | undefined;
  kind: 'image' | 'video';
  surface: DeliverableSurface;
}

function readStagedMedia(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(STAGING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { mediaUrls?: unknown };
    return Array.isArray(parsed.mediaUrls)
      ? (parsed.mediaUrls as unknown[]).filter((u): u is string => typeof u === 'string')
      : [];
  } catch { return []; }
}

function clearStagedMedia() {
  if (typeof window === 'undefined') return;
  try { window.sessionStorage.removeItem(STAGING_KEY); } catch { /* ignore */ }
}

function buildDeliverableRows(platforms: PlatformId[]): DeliverableRow[] {
  const out: DeliverableRow[] = [];
  for (const pid of platforms) {
    const spec = PLATFORM_SPECS[pid];
    if (!spec) continue;
    for (const img of spec.images) {
      out.push({
        key: `${pid}|${img.label}`,
        platform: pid,
        label: img.label,
        ratio: img.ratio,
        size: img.size,
        kind: 'image',
        surface: inferSurface(img.label),
      });
    }
    for (const vid of spec.videos) {
      out.push({
        key: `${pid}|${vid.label}`,
        platform: pid,
        label: vid.label,
        ratio: vid.ratio,
        size: vid.size,
        kind: 'video',
        surface: inferSurface(vid.label),
      });
    }
  }
  return out;
}

function aspectStyle(ratio: string): React.CSSProperties {
  const m = ratio.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!m) return { aspectRatio: '1 / 1' };
  return { aspectRatio: `${m[1]} / ${m[2]}` };
}

interface LibraryAsset {
  id: string;
  url: string;
  thumbUrl: string;
  kind: 'image' | 'video';
  filename: string | null;
}

export default function CreatePostContent() {
  const router = useRouter();
  const { session } = useAuth();
  const [stagedMedia, setStagedMedia] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [platforms, setPlatforms] = useState<Set<PlatformId>>(() => new Set(['facebook', 'instagram', 'linkedin']));
  // Per-deliverable media URL. Keyed by "${platform}|${label}".
  const [urlByKey, setUrlByKey] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Build library — fetched once on mount; surfaced via a
  // hover-overlay "Pick from library" button on each deliverable
  // slot. The library is the same site_images / site_videos pool
  // the Build (Library) tab renders.
  const [libraryAssets, setLibraryAssets] = useState<LibraryAsset[]>([]);
  const [pickerForKey, setPickerForKey] = useState<string | null>(null);

  useEffect(() => {
    const m = readStagedMedia();
    setStagedMedia(m);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [imagesRes, videosRes] = await Promise.all([
        supabase.from('site_images')
          .select('id, public_url, filename')
          // Recently-used assets bubble to the top across every
          // surface that picks media.
          .order('last_used_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(200),
        supabase.from('site_videos')
          .select('id, video_url, thumbnail_url, filename')
          .order('last_used_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(80),
      ]);
      if (cancelled) return;
      const imageRows = (imagesRes.data ?? []) as Array<{ id: string; public_url: string; filename: string | null }>;
      const videoRows = (videosRes.data ?? []) as Array<{ id: string; video_url: string | null; thumbnail_url: string | null; filename: string | null }>;
      const merged: LibraryAsset[] = [
        ...imageRows.map<LibraryAsset>((r) => ({ id: `img:${r.id}`, url: r.public_url, thumbUrl: r.public_url, kind: 'image', filename: r.filename })),
        ...videoRows
          .filter((r) => Boolean(r.video_url))
          .map<LibraryAsset>((r) => ({ id: `vid:${r.id}`, url: r.video_url as string, thumbUrl: r.thumbnail_url || (r.video_url as string), kind: 'video', filename: r.filename })),
      ];
      setLibraryAssets(merged);
    })();
    return () => { cancelled = true; };
  }, []);

  // All raw rows for the picked platforms, then filtered by the
  // per-platform surface picks from the Deliverables card below.
  const allRows = useMemo(
    () => buildDeliverableRows(Array.from(platforms).sort()),
    [platforms],
  );

  // Per-platform set of surfaces the user wants to produce.
  // Key: PlatformId. Value: Set<DeliverableSurface>.
  // Stored as an object so it survives setState immutability
  // without deep-cloning Sets.
  const [enabledSurfaces, setEnabledSurfaces] = useState<Record<string, DeliverableSurface[]>>({});

  // Available surfaces per selected platform — derived from the
  // raw row set so adding a new label only requires updating
  // platform-specs.ts.
  const surfacesByPlatform = useMemo(() => {
    const out = new Map<PlatformId, DeliverableSurface[]>();
    for (const row of allRows) {
      const list = out.get(row.platform) ?? [];
      if (!list.includes(row.surface)) list.push(row.surface);
      out.set(row.platform, list);
    }
    return out;
  }, [allRows]);

  // Default: when a platform is freshly added, enable every surface
  // it offers. The user can then uncheck the ones they don't want.
  useEffect(() => {
    setEnabledSurfaces((prev) => {
      const next: Record<string, DeliverableSurface[]> = {};
      for (const [pid, surfaces] of surfacesByPlatform.entries()) {
        next[pid] = prev[pid]
          // Drop any surfaces that are no longer offered by the
          // platform (defensive — labels shouldn't disappear in
          // practice).
          ? prev[pid].filter((s) => surfaces.includes(s))
          : surfaces.slice();
      }
      return next;
    });
  }, [surfacesByPlatform]);

  const rows = useMemo(() => {
    return allRows.filter((r) => {
      const enabled = enabledSurfaces[r.platform];
      // Until the surfaces state has caught up with a freshly-added
      // platform, treat everything as enabled so the user never
      // sees an empty slots grid during the transition tick.
      if (!enabled) return true;
      return enabled.includes(r.surface);
    });
  }, [allRows, enabledSurfaces]);

  const togglePlatform = (pid: PlatformId) => {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid); else next.add(pid);
      return next;
    });
  };

  const toggleSurface = (pid: PlatformId, surface: DeliverableSurface) => {
    setEnabledSurfaces((prev) => {
      const list = prev[pid] ?? [];
      const has = list.includes(surface);
      const nextList = has
        ? list.filter((s) => s !== surface)
        : [...list, surface];
      return { ...prev, [pid]: nextList };
    });
  };

  const usePrimaryForKey = (key: string) => {
    if (stagedMedia.length === 0) return;
    setUrlByKey((prev) => ({ ...prev, [key]: stagedMedia[0] }));
  };

  const usePrimaryForAll = () => {
    if (stagedMedia.length === 0) return;
    const first = stagedMedia[0];
    setUrlByKey(Object.fromEntries(rows.map((r) => [r.key, first])));
  };

  const generateCaption = async () => {
    if (!session?.access_token || generatingCaption) return;
    setGeneratingCaption(true);
    setError(null);
    try {
      const r = await fetch('/api/claude/social-caption/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          platforms: Array.from(platforms),
          mediaUrls: stagedMedia,
          // Reuse whatever's in the textbox as a hint — lets the
          // user iterate on a generated caption by tweaking the
          // hint and clicking again.
          hint: caption.trim(),
        }),
      });
      const json = (await r.json().catch(() => ({}))) as { caption?: string; error?: string };
      if (!r.ok || !json.caption) {
        setError(json.error ?? `HTTP ${r.status}`);
        return;
      }
      setCaption(json.caption);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGeneratingCaption(false);
    }
  };

  const onSaveReady = () => {
    if (caption.trim().length === 0) {
      setError('Add a caption before saving.');
      return;
    }
    if (platforms.size === 0) {
      setError('Pick at least one network.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const draft: SavedDraft = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
        caption: caption.trim(),
        mediaUrls: stagedMedia,
        platforms: Array.from(platforms),
        ready: true,
        mediaByDeliverable: Object.entries(urlByKey)
          .filter(([, url]) => url && url.trim().length > 0)
          .map(([key, url]) => ({ key, url })),
      };
      const all = readSavedDrafts();
      writeSavedDrafts([draft, ...all]);
      clearStagedMedia();
      router.push('/feather/social-media?tab=creative&sub=ai');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto">
      <header className="mb-5 flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">
            Social Media · Create post
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Build the post · {stagedMedia.length} {stagedMedia.length === 1 ? 'asset' : 'assets'} staged
          </h1>
          <p className="mt-1 text-[12.5px] text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
            Fill the deliverable slots for every network you&apos;re posting to, then save it ready-to-go.
          </p>
        </div>
        <Link
          href="/feather/social-media?tab=creative"
          className="px-3 py-1.5 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
        >
          ← Cancel
        </Link>
      </header>

      {/* Staged media preview */}
      {stagedMedia.length > 0 && (
        <section className="rounded-2xl border border-black/10 bg-white p-4 mb-4">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-2">
            Media from Build
          </p>
          <ul className="flex flex-wrap gap-2">
            {stagedMedia.map((url, i) => (
              <li key={i} className="w-20 h-20 rounded-lg overflow-hidden border border-black/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Caption */}
      <section className="rounded-2xl border border-black/10 bg-white p-4 mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">Caption</span>
          <button
            type="button"
            onClick={generateCaption}
            disabled={generatingCaption || !session?.access_token}
            title="Draft a caption with Claude"
            aria-label="Draft caption with Claude"
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-primary/30 bg-primary/5 text-primary text-[11px] font-semibold hover:bg-primary/10 disabled:opacity-50"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <ClaudeMark className="w-3.5 h-3.5" />
            {generatingCaption ? 'Drafting…' : 'Write with Claude'}
          </button>
        </div>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={5}
          placeholder="Write the post copy…"
          className="w-full px-3 py-2 rounded-md border border-black/10 text-[13.5px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30"
          style={{ fontFamily: 'var(--font-body)' }}
        />
      </section>

      {/* Platform picker */}
      <section className="rounded-2xl border border-black/10 bg-white p-4 mb-4">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-2">
          Networks · {platforms.size}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_PLATFORM_IDS.map((pid) => {
            const on = platforms.has(pid);
            return (
              <button
                key={pid}
                type="button"
                onClick={() => togglePlatform(pid)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11.5px] font-semibold transition-colors ${on ? 'bg-primary text-white border-primary' : 'bg-white text-foreground/55 border-black/10 hover:bg-warm-bg/60'}`}
              >
                <span className={`inline-flex items-center justify-center w-3.5 h-3.5 ${on ? 'text-white' : 'text-foreground/55'}`}>
                  <PlatformIcon platform={pid} size={12} />
                </span>
                {PLATFORM_LABELS[pid] ?? pid}
              </button>
            );
          })}
        </div>
      </section>

      {/* Deliverables · per-platform checklist of surfaces
          (Post / Story / Reel / etc). Each selected platform gets
          a row; the surfaces it offers come from the inferred
          DeliverableSurface attached to each row in
          platform-specs.ts. Toggling a surface off filters its
          slots out of the Deliverable Slots grid below. Defaults:
          every surface enabled the moment a platform is picked. */}
      {platforms.size > 0 && surfacesByPlatform.size > 0 && (
        <section className="rounded-2xl border border-black/10 bg-white p-4 mb-4">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-2">
            Deliverables
          </p>
          <p className="text-[11.5px] text-foreground/50 mb-3" style={{ fontFamily: 'var(--font-body)' }}>
            Pick which surfaces each network gets. Uncheck the ones you don&rsquo;t want to produce a crop for.
          </p>
          <ul className="divide-y divide-black/5">
            {ALL_PLATFORM_IDS.filter((pid) => platforms.has(pid)).map((pid) => {
              const surfaces = surfacesByPlatform.get(pid) ?? [];
              if (surfaces.length === 0) return null;
              const enabled = enabledSurfaces[pid] ?? surfaces;
              return (
                <li key={pid} className="py-2 flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 min-w-[6.5rem]">
                    <span className="inline-flex items-center justify-center w-4 h-4 text-foreground/70">
                      <PlatformIcon platform={pid} size={14} />
                    </span>
                    <span className="text-[12.5px] font-semibold text-foreground/85">
                      {PLATFORM_LABELS[pid] ?? pid}
                    </span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {surfaces.map((surface) => {
                      const on = enabled.includes(surface);
                      return (
                        <label
                          key={surface}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11.5px] font-semibold cursor-pointer transition-colors ${
                            on
                              ? 'bg-primary/10 text-primary border-primary/40'
                              : 'bg-white text-foreground/55 border-black/10 hover:bg-warm-bg/60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggleSurface(pid, surface)}
                            className="w-3 h-3 accent-primary"
                            aria-label={`${SURFACE_LABEL[surface]} for ${PLATFORM_LABELS[pid] ?? pid}`}
                          />
                          {SURFACE_LABEL[surface]}
                        </label>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Deliverable upload slots */}
      <section className="rounded-2xl border border-black/10 bg-white p-4 mb-5">
        <header className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">
              Deliverable slots · {rows.length}
            </p>
            <p className="text-[11.5px] text-foreground/50 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
              One slot per crop the targeted networks need. Paste a media URL or click <em>Use staged media</em>.
            </p>
          </div>
          {stagedMedia.length > 0 && rows.length > 0 && (
            <button
              type="button"
              onClick={usePrimaryForAll}
              className="px-2.5 py-1 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
            >
              Use staged media for every slot
            </button>
          )}
        </header>

        {rows.length === 0 ? (
          <p className="text-[12.5px] text-foreground/55 italic" style={{ fontFamily: 'var(--font-body)' }}>
            Pick at least one network above to load its deliverable slots.
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rows.map((row) => {
              const url = urlByKey[row.key] ?? '';
              return (
                <li key={row.key} className="rounded-xl border border-black/10 bg-warm-bg/30 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="inline-flex items-center justify-center w-4 h-4 text-foreground/65">
                      <PlatformIcon platform={row.platform} size={13} />
                    </span>
                    <span className="text-[12px] font-semibold text-foreground">{PLATFORM_LABELS[row.platform] ?? row.platform}</span>
                    <span className="text-foreground/35 text-[10px]">·</span>
                    <span className="text-[11.5px] text-foreground/65 truncate">{row.label}</span>
                    <span className={`ml-auto text-[8.5px] font-semibold uppercase tracking-wider ${row.kind === 'video' ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {row.kind}
                    </span>
                  </div>

                  {/* Preview at the actual aspect ratio so the marketer
                      eyeballs the crop they're filling. Hover reveals
                      a "Pick from library" overlay so the picker can
                      be reached without leaving the row. */}
                  <div
                    className={`group relative w-full rounded-md overflow-hidden mb-2 ${url ? '' : 'border-2 border-dashed border-black/15 bg-white'}`}
                    style={aspectStyle(row.ratio)}
                  >
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-foreground/35">
                        {row.ratio === 'free' ? 'Any ratio' : row.ratio}
                        {row.size && <span className="ml-1 text-foreground/30">· {row.size}</span>}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setPickerForKey(row.key)}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-[11px] font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      Pick from library
                    </button>
                  </div>

                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrlByKey((prev) => ({ ...prev, [row.key]: e.target.value }))}
                    placeholder="Paste a media URL"
                    className="w-full px-2 py-1.5 rounded-md border border-black/10 text-[11.5px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                    style={{ fontFamily: 'var(--font-body)' }}
                  />
                  {stagedMedia.length > 0 && (
                    <button
                      type="button"
                      onClick={() => usePrimaryForKey(row.key)}
                      className="mt-1.5 w-full px-2 py-1 rounded-md bg-foreground text-white text-[10px] font-semibold uppercase tracking-wider hover:bg-foreground/85"
                    >
                      Use staged media
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {error && <p className="mb-3 text-[12px] text-red-700" role="alert">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <Link
          href="/feather/social-media?tab=creative"
          className="px-4 py-2 rounded-md border border-black/10 bg-white text-[12px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={onSaveReady}
          disabled={saving}
          className="px-4 py-2 rounded-md bg-primary text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {saving ? 'Saving…' : 'Save and ready to go'}
        </button>
      </div>

      {/* Library picker — triggered from any slot's "Pick from
          library" hover overlay. Click an asset to assign its URL
          to that slot. */}
      {pickerForKey !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPickerForKey(null)}
        >
          <div
            className="w-full max-w-3xl max-h-[80vh] rounded-2xl bg-white shadow-xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="px-5 py-3 border-b border-black/5 flex items-baseline justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Pick media from library</h3>
                <p className="text-[11.5px] text-foreground/55 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                  {libraryAssets.length} asset{libraryAssets.length === 1 ? '' : 's'} from Build.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerForKey(null)}
                className="text-[11px] text-foreground/55 hover:text-foreground"
              >
                ✕
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-4">
              {libraryAssets.length === 0 ? (
                <p className="text-[12.5px] text-foreground/55 italic text-center py-12" style={{ fontFamily: 'var(--font-body)' }}>
                  Library is empty. Upload media via Build first.
                </p>
              ) : (
                <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                  {libraryAssets.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setUrlByKey((prev) => ({ ...prev, [pickerForKey]: a.url }));
                          setPickerForKey(null);
                        }}
                        className="relative w-full aspect-square rounded-md overflow-hidden border border-black/10 hover:border-primary hover:ring-2 hover:ring-primary/30 transition-all"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={a.thumbUrl} alt={a.filename ?? ''} className="w-full h-full object-cover" />
                        {a.kind === 'video' && (
                          <span className="absolute top-1 right-1 px-1 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider bg-rose-500 text-white">VID</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Stylised Anthropic / Claude mark — eight rays radiating from a
// center dot. Used on the "Write with Claude" button so the
// affordance reads as "AI assist" without needing the wordmark.
function ClaudeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="2" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}
