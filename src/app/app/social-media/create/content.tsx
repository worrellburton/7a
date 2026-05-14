'use client';

// Create Post page — landing point for the Build → Continue
// hand-off. Hydrates from the same sessionStorage staging key that
// the old Library → AI path used, then asks the marketer to:
//
//   1. Confirm / edit the caption.
//   2. Pick which networks the post is going to.
//   3. Fill an upload slot for every deliverable that those
//      networks need (one per spec / aspect ratio). The first
//      staged media URL is offered as a starter, so a single
//      square already prefills the 1:1 slots; the rest land
//      as "Use a copy of …" buttons.
//   4. Hit "Save and ready to go" — that commits a SavedDraft
//      with ready: true + the captured per-deliverable URLs and
//      routes back to Creative > Ready to go.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

interface DeliverableRow {
  key: string;            // "${platform}|${label}"
  platform: PlatformId;
  label: string;          // "Feed (1:1)"
  ratio: string;          // "1:1"
  size: string | undefined;
  kind: 'image' | 'video';
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

export default function CreatePostContent() {
  const router = useRouter();
  const [stagedMedia, setStagedMedia] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [platforms, setPlatforms] = useState<Set<PlatformId>>(() => new Set(['facebook', 'instagram', 'linkedin']));
  // Per-deliverable media URL. Keyed by "${platform}|${label}".
  const [urlByKey, setUrlByKey] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const m = readStagedMedia();
    setStagedMedia(m);
  }, []);

  const rows = useMemo(
    () => buildDeliverableRows(Array.from(platforms).sort()),
    [platforms],
  );

  const togglePlatform = (pid: PlatformId) => {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid); else next.add(pid);
      return next;
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
      router.push('/app/social-media?tab=creative&sub=ai');
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
          href="/app/social-media?tab=creative"
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
        <label className="block">
          <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">Caption</span>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={5}
            placeholder="Write the post copy…"
            className="mt-1.5 w-full px-3 py-2 rounded-md border border-black/10 text-[13.5px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30"
            style={{ fontFamily: 'var(--font-body)' }}
          />
        </label>
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
                      eyeballs the crop they're filling */}
                  <div
                    className={`w-full rounded-md overflow-hidden mb-2 ${url ? '' : 'border-2 border-dashed border-black/15 bg-white'}`}
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
          href="/app/social-media?tab=creative"
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
    </div>
  );
}
