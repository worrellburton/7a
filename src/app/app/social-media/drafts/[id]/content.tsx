'use client';

// Per-draft detail page. Renders a single SavedDraft with its
// caption, media, ready/in-progress badge, the platforms it's
// targeted at, and a full breakdown of the deliverables every
// targeted platform needs (per-platform bullet list + a
// de-duplicated "unique crops" grid).

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { findSavedDraft, readSavedDrafts, writeSavedDrafts, type SavedDraft } from '../../saved-drafts';
import { PLATFORM_SPECS, type MediaSpec, type VideoSpec } from '../../platform-specs';
import { PlatformIcon, type PlatformId } from '../../PlatformIcon';

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

interface Deliverable {
  ratio: string;
  hasImage: boolean;
  hasVideo: boolean;
  networks: PlatformId[];
  uses: string[];
  bestSize: string | null;
}

const RATIO_DISPLAY_ORDER = ['9:16', '4:5', '1:1', '5:8', '2:3', '4:3', '1.91:1', '16:9', 'free'];

function atomicRatios(raw: string): string[] {
  const parts = raw.split(/\s*[/,]\s*/).map((s) => s.trim()).filter(Boolean);
  return parts.map((p) => /^\d+(?:\.\d+)?\s*:\s*\d+(?:\.\d+)?$/.test(p) ? p.replace(/\s+/g, '') : 'free');
}

function areaOf(size: string | undefined): number {
  if (!size) return 0;
  const m = size.match(/(\d{2,5})\s*[×x]\s*(\d{2,5})/);
  return m ? Number(m[1]) * Number(m[2]) : 0;
}

function useFromLabel(label: string): string {
  return label.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

function deriveDeliverables(platforms: PlatformId[]): Deliverable[] {
  const map = new Map<string, Deliverable>();
  const upsert = (ratio: string, p: PlatformId, spec: MediaSpec | VideoSpec, isVideo: boolean) => {
    const existing = map.get(ratio);
    const use = useFromLabel(spec.label);
    if (!existing) {
      map.set(ratio, {
        ratio,
        hasImage: !isVideo,
        hasVideo: isVideo,
        networks: [p],
        uses: [use],
        bestSize: spec.size ?? null,
      });
      return;
    }
    if (isVideo) existing.hasVideo = true; else existing.hasImage = true;
    if (!existing.networks.includes(p)) existing.networks.push(p);
    if (!existing.uses.includes(use)) existing.uses.push(use);
    if (spec.size && areaOf(spec.size) > areaOf(existing.bestSize ?? undefined)) existing.bestSize = spec.size;
  };
  for (const id of platforms) {
    const spec = PLATFORM_SPECS[id];
    if (!spec) continue;
    for (const img of spec.images) for (const r of atomicRatios(img.ratio)) upsert(r, id, img, false);
    for (const vid of spec.videos) for (const r of atomicRatios(vid.ratio)) upsert(r, id, vid, true);
  }
  return Array.from(map.values()).sort((a, b) => {
    const ai = RATIO_DISPLAY_ORDER.indexOf(a.ratio);
    const bi = RATIO_DISPLAY_ORDER.indexOf(b.ratio);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

export default function DraftDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<SavedDraft | null | undefined>(undefined);

  // Hydrate from localStorage. Listen for cross-tab edits so the
  // page stays in sync if someone tweaks the draft elsewhere.
  useEffect(() => {
    setDraft(findSavedDraft(id));
    const onChange = () => setDraft(findSavedDraft(id));
    window.addEventListener('social-media-drafts-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('social-media-drafts-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, [id]);

  const platforms: PlatformId[] = useMemo(() => {
    const p = draft?.platforms;
    if (p && p.length > 0) return p.filter((id): id is PlatformId => ALL_PLATFORM_IDS.includes(id as PlatformId));
    return ALL_PLATFORM_IDS;
  }, [draft]);

  const deliverables = useMemo(() => deriveDeliverables(platforms), [platforms]);

  const togglePlatform = (pid: PlatformId) => {
    if (!draft) return;
    const cur = new Set(draft.platforms ?? ALL_PLATFORM_IDS);
    if (cur.has(pid)) cur.delete(pid); else cur.add(pid);
    const next = { ...draft, platforms: Array.from(cur) };
    const all = readSavedDrafts().map((d) => (d.id === draft.id ? next : d));
    writeSavedDrafts(all);
    setDraft(next);
  };

  const toggleReady = () => {
    if (!draft) return;
    const next = { ...draft, ready: !draft.ready };
    const all = readSavedDrafts().map((d) => (d.id === draft.id ? next : d));
    writeSavedDrafts(all);
    setDraft(next);
  };

  if (draft === undefined) {
    return <p className="p-6 text-foreground/55">Loading…</p>;
  }
  if (draft === null) {
    return (
      <div className="p-6 lg:p-10">
        <p className="text-sm text-foreground/70 mb-3">Draft not found. It may have been deleted on this device.</p>
        <button
          type="button"
          onClick={() => router.push('/app/social-media?tab=creative&sub=templates')}
          className="px-3 py-1.5 rounded-md bg-foreground text-white text-[11px] font-semibold uppercase tracking-wider"
        >
          Back to drafts
        </button>
      </div>
    );
  }

  const created = new Date(draft.createdAt).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto">
      <header className="mb-5 flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">
            Social Media · Draft
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            {(draft.caption || 'Untitled draft').slice(0, 80)}
          </h1>
          <p className="mt-1 text-[12px] text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
            Saved {created}
            {draft.ready
              ? <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-[9px] font-bold uppercase tracking-wider">● Ready</span>
              : <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-warm-bg text-foreground/55 text-[9px] font-bold uppercase tracking-wider">In progress</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/app/social-media?tab=creative&sub=templates"
            className="px-3 py-1.5 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
          >
            ← Back
          </Link>
          <button
            type="button"
            onClick={toggleReady}
            className={`px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider ${draft.ready ? 'border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50' : 'bg-primary text-white hover:bg-primary-dark'}`}
          >
            {draft.ready ? 'Move back to drafts' : 'Mark ready to go'}
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-black/10 bg-white p-5 mb-4">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-2">Caption</p>
        <p className="text-[14px] text-foreground/85 whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
          {draft.caption || <span className="text-foreground/40 italic">(no caption)</span>}
        </p>
        {draft.mediaUrls.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-2">Media · {draft.mediaUrls.length}</p>
            <ul className="flex flex-wrap gap-2">
              {draft.mediaUrls.map((url) => (
                <li key={url} className="w-24 h-24 rounded-lg overflow-hidden border border-black/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Draft media" className="w-full h-full object-cover" />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-5 mb-4">
        <header className="flex items-baseline justify-between mb-2">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">
            Target platforms · {platforms.length}
          </p>
          <p className="text-[10.5px] text-foreground/45">Tap a network to include or exclude it.</p>
        </header>
        <div className="flex flex-wrap gap-1.5">
          {ALL_PLATFORM_IDS.map((pid) => {
            const on = platforms.includes(pid);
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

      <section className="rounded-2xl border border-black/10 bg-white p-5">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-3">
          Deliverables required for this post
        </p>

        {/* Crop preview — one tile per (platform, spec) drawn at
            the actual aspect ratio. If the Create page captured a
            media URL for that slot via mediaByDeliverable, the
            tile renders that asset; otherwise it shows a dashed
            placeholder with the spec size. This is the closest the
            page can get to "previewing how the post will deploy"
            without actually invoking the platform APIs. */}
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45 mb-2">Per-slot preview</p>
        {(() => {
          const mediaMap = new Map((draft.mediaByDeliverable ?? []).map((m) => [m.key, m.url] as const));
          const tiles: { key: string; platform: PlatformId; label: string; ratio: string; size: string | undefined; kind: 'image' | 'video'; url: string | undefined }[] = [];
          for (const pid of platforms) {
            const spec = PLATFORM_SPECS[pid];
            if (!spec) continue;
            for (const img of spec.images) {
              const key = `${pid}|${img.label}`;
              tiles.push({ key, platform: pid, label: img.label, ratio: img.ratio, size: img.size, kind: 'image', url: mediaMap.get(key) ?? draft.mediaUrls[0] });
            }
            for (const vid of spec.videos) {
              const key = `${pid}|${vid.label}`;
              tiles.push({ key, platform: pid, label: vid.label, ratio: vid.ratio, size: vid.size, kind: 'video', url: mediaMap.get(key) });
            }
          }
          if (tiles.length === 0) return null;
          return (
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
              {tiles.map((t) => {
                const ratioStyle = (() => {
                  const m = t.ratio.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
                  if (!m) return { aspectRatio: '1 / 1' as const };
                  return { aspectRatio: `${m[1]} / ${m[2]}` };
                })();
                return (
                  <li key={t.key} className="rounded-xl border border-black/10 bg-warm-bg/20 p-2.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="inline-flex items-center justify-center w-3.5 h-3.5 text-foreground/65">
                        <PlatformIcon platform={t.platform} size={12} />
                      </span>
                      <span className="text-[11px] font-semibold text-foreground truncate">{PLATFORM_LABELS[t.platform] ?? t.platform}</span>
                      <span className={`ml-auto text-[8.5px] font-semibold uppercase tracking-wider ${t.kind === 'video' ? 'text-rose-600' : 'text-emerald-700'}`}>{t.kind}</span>
                    </div>
                    <div
                      className={`w-full rounded-md overflow-hidden ${t.url ? '' : 'border-2 border-dashed border-black/15 bg-white'}`}
                      style={ratioStyle}
                    >
                      {t.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-foreground/35">
                          {t.ratio === 'free' ? 'Any ratio' : t.ratio}
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-[10px] text-foreground/55 leading-snug truncate" style={{ fontFamily: 'var(--font-body)' }}>
                      {t.label}{t.size && <span className="text-foreground/35"> · {t.size}</span>}
                    </p>
                  </li>
                );
              })}
            </ul>
          );
        })()}

        {/* Per-platform bullet list */}
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45 mb-2">By platform</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
          {platforms.map((pid) => {
            const spec = PLATFORM_SPECS[pid];
            if (!spec) return null;
            const lines: { kind: 'image' | 'video'; label: string; size: string | undefined }[] = [];
            for (const img of spec.images) lines.push({ kind: 'image', label: img.label, size: img.size });
            for (const vid of spec.videos) lines.push({ kind: 'video', label: vid.label, size: vid.size });
            return (
              <li key={pid} className="rounded-lg border border-black/10 bg-warm-bg/30 px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 text-foreground/65">
                    <PlatformIcon platform={pid} size={13} />
                  </span>
                  <span className="text-[12px] font-semibold text-foreground">{PLATFORM_LABELS[pid] ?? pid}</span>
                  <span className="ml-auto text-[10px] text-foreground/40 tabular-nums">{lines.length}</span>
                </div>
                <ul className="space-y-0.5">
                  {lines.map((l, i) => (
                    <li key={i} className="text-[11.5px] text-foreground/70 leading-snug flex items-start gap-1.5">
                      <span aria-hidden className="text-foreground/30 mt-[1px]">•</span>
                      <span className="flex-1">
                        <span className="text-foreground/85">{l.label}</span>
                        {l.size && <span className="text-foreground/40 tabular-nums"> · {l.size}</span>}
                      </span>
                      <span className={`text-[8.5px] font-semibold uppercase tracking-wider ${l.kind === 'video' ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {l.kind}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>

        {/* De-duplicated unique-crops grid */}
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45 mb-2">
          Unique crops · {deliverables.length}
        </p>
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {deliverables.map((d) => (
            <DeliverableCard key={d.ratio} d={d} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function DeliverableCard({ d }: { d: Deliverable }) {
  const previewStyle = (() => {
    if (d.ratio === 'free') return { aspectRatio: '1 / 1' };
    const m = d.ratio.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
    if (!m) return { aspectRatio: '1 / 1' };
    return { aspectRatio: `${m[1]} / ${m[2]}` };
  })();
  const tone = d.hasVideo && d.hasImage
    ? 'bg-violet-50 text-violet-700 border-violet-200'
    : d.hasVideo
    ? 'bg-rose-50 text-rose-700 border-rose-200'
    : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  const typeLabel = d.hasVideo && d.hasImage ? 'Image + video' : d.hasVideo ? 'Video' : 'Image';
  return (
    <li className="rounded-lg border border-black/10 bg-white px-3 py-2.5 flex gap-2.5">
      <div className="shrink-0 w-10 flex items-center justify-center">
        <div
          className={`w-9 max-h-12 rounded-sm ${d.ratio === 'free' ? 'border-2 border-dashed border-foreground/25 bg-warm-bg/40' : 'bg-foreground/10'}`}
          style={previewStyle}
          aria-hidden="true"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-semibold text-foreground tabular-nums">
            {d.ratio === 'free' ? 'Any ratio' : d.ratio}
          </span>
          <span className={`inline-block px-1 py-0.5 rounded text-[8.5px] font-semibold border ${tone}`}>
            {typeLabel}
          </span>
        </div>
        <p className="mt-0.5 text-[10.5px] text-foreground/55 leading-snug line-clamp-2" title={d.uses.join(' · ')}>
          {d.uses.join(' · ')}
        </p>
        <div className="mt-1 flex items-center gap-1">
          {d.networks.map((n) => (
            <span
              key={n}
              className="inline-flex items-center justify-center w-4 h-4 text-foreground/60"
              title={n}
              aria-label={n}
            >
              <PlatformIcon platform={n} size={12} />
            </span>
          ))}
          {d.bestSize && <span className="ml-auto text-[9.5px] text-foreground/40 tabular-nums">{d.bestSize}</span>}
        </div>
      </div>
    </li>
  );
}
