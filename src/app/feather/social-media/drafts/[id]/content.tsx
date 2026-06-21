'use client';

// Per-draft detail page. Renders a single SavedDraft with its
// caption, media, ready/in-progress badge, the platforms it's
// targeted at, and a full breakdown of the deliverables every
// targeted platform needs (per-platform bullet list + a
// de-duplicated "unique crops" grid).

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSavedDrafts, updateDraft, type SavedDraft } from '../../saved-drafts';
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

interface SpecLine { key: string; label: string; size: string | undefined; ratio: string; kind: 'image' | 'video'; }
// Flat list of one platform's deliverables. Keyed
// `${platformId}|${kind}|${index}|${label}` — the kind+index make it
// UNIQUE even when two specs share a label (e.g. Facebook has a
// "Story (9:16)" in both images and videos). A bare `${pid}|${label}`
// key collided, which broke React's list reconciliation (phantom rows
// you couldn't uncheck).
function specLinesFor(pid: PlatformId): SpecLine[] {
  const spec = PLATFORM_SPECS[pid];
  if (!spec) return [];
  const out: SpecLine[] = [];
  spec.images.forEach((img, i) => out.push({ key: `${pid}|image|${i}|${img.label}`, label: img.label, size: img.size, ratio: img.ratio, kind: 'image' }));
  spec.videos.forEach((vid, i) => out.push({ key: `${pid}|video|${i}|${vid.label}`, label: vid.label, size: vid.size, ratio: vid.ratio, kind: 'video' }));
  return out;
}

export default function DraftDetailContent({ id }: { id: string }) {
  const router = useRouter();
  // DB-backed + live across devices via the shared drafts hook.
  const { drafts, loading } = useSavedDrafts();
  const draft = useMemo<SavedDraft | null>(() => drafts.find((d) => d.id === id) ?? null, [drafts, id]);

  const platforms: PlatformId[] = useMemo(() => {
    const p = draft?.platforms;
    if (p && p.length > 0) return p.filter((id): id is PlatformId => ALL_PLATFORM_IDS.includes(id as PlatformId));
    return ALL_PLATFORM_IDS;
  }, [draft]);

  const deliverables = useMemo(() => deriveDeliverables(platforms), [platforms]);

  // Deliverables UI: one tab per targeted platform; checking a deliverable
  // decides which slots are "inputted" (shown in the per-slot preview).
  const [activeTab, setActiveTab] = useState<PlatformId | null>(null);
  useEffect(() => {
    if (platforms.length === 0) { setActiveTab(null); return; }
    setActiveTab((cur) => (cur && platforms.includes(cur) ? cur : platforms[0]));
  }, [platforms]);

  const allKeys = useMemo(() => platforms.flatMap((pid) => specLinesFor(pid).map((l) => l.key)), [platforms]);
  // Empty stored selection means "not customised yet" → treat all checked.
  const selectedSet = useMemo(() => {
    const sel = draft?.selectedDeliverables ?? [];
    return sel.length > 0 ? new Set(sel) : new Set(allKeys);
  }, [draft?.selectedDeliverables, allKeys]);

  const toggleDeliverable = (key: string) => {
    if (!draft) return;
    const next = new Set(selectedSet);
    if (next.has(key)) next.delete(key); else next.add(key);
    void updateDraft(draft.id, { selectedDeliverables: Array.from(next) });
  };

  const togglePlatform = (pid: PlatformId) => {
    if (!draft) return;
    const cur = new Set(draft.platforms ?? ALL_PLATFORM_IDS);
    if (cur.has(pid)) cur.delete(pid); else cur.add(pid);
    void updateDraft(draft.id, { platforms: Array.from(cur) });
  };

  const toggleReady = () => {
    if (!draft) return;
    void updateDraft(draft.id, { ready: !draft.ready });
  };

  if (loading && !draft) {
    return <p className="p-6 text-foreground/55">Loading…</p>;
  }
  if (!draft) {
    return (
      <div className="p-6 lg:p-10">
        <p className="text-sm text-foreground/70 mb-3">Draft not found. It may have been deleted on this device.</p>
        <button
          type="button"
          onClick={() => router.push('/feather/social-media?tab=creative&sub=templates')}
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
            href="/feather/social-media?tab=creative&sub=templates"
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

        <p className="text-[11px] text-foreground/45 mb-3" style={{ fontFamily: 'var(--font-body)' }}>
          Pick the deliverables you need on each platform — what you check decides which slots show in the per-slot preview.
        </p>

        {platforms.length === 0 ? (
          <p className="text-[12.5px] text-foreground/45 italic">Select at least one target platform above.</p>
        ) : activeTab && (
          <>
            {/* Platform tabs */}
            <div className="flex flex-wrap gap-1.5 border-b border-black/5 pb-2 mb-3">
              {platforms.map((pid) => {
                const on = pid === activeTab;
                const lines = specLinesFor(pid);
                const checked = lines.filter((l) => selectedSet.has(l.key)).length;
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => setActiveTab(pid)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${on ? 'bg-foreground text-white' : 'bg-warm-bg/50 text-foreground/65 hover:bg-warm-bg'}`}
                  >
                    <span className={`inline-flex items-center justify-center w-3.5 h-3.5 ${on ? 'text-white' : 'text-foreground/60'}`}>
                      <PlatformIcon platform={pid} size={12} />
                    </span>
                    {PLATFORM_LABELS[pid] ?? pid}
                    <span className={`ml-0.5 text-[9.5px] font-bold tabular-nums ${on ? 'text-white/70' : 'text-foreground/40'}`}>{checked}/{lines.length}</span>
                  </button>
                );
              })}
            </div>

            {/* Active platform — checkable deliverables */}
            <ul className="space-y-0.5 mb-4">
              {specLinesFor(activeTab).map((l) => {
                const isChecked = selectedSet.has(l.key);
                return (
                  <li key={l.key}>
                    <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-warm-bg/40 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleDeliverable(l.key)}
                        className="w-4 h-4 accent-primary shrink-0"
                      />
                      <span className="flex-1 text-[12.5px] text-foreground/85 leading-snug">
                        {l.label}
                        {l.size && <span className="text-foreground/40 tabular-nums"> · {l.size}</span>}
                      </span>
                      <span className={`text-[8.5px] font-semibold uppercase tracking-wider ${l.kind === 'video' ? 'text-rose-600' : 'text-emerald-700'}`}>{l.kind}</span>
                    </label>
                  </li>
                );
              })}
            </ul>

            {/* Per-slot preview — only the CHECKED deliverables for this platform */}
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45 mb-2">Per-slot preview</p>
            {(() => {
              const mediaMap = new Map((draft.mediaByDeliverable ?? []).map((m) => [m.key, m.url] as const));
              const lines = specLinesFor(activeTab).filter((l) => selectedSet.has(l.key));
              if (lines.length === 0) {
                return <p className="text-[12px] text-foreground/45 italic mb-2">No deliverables checked for {PLATFORM_LABELS[activeTab] ?? activeTab} yet.</p>;
              }
              return (
                <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                  {lines.map((t) => {
                    const ratioStyle = (() => {
                      const m = t.ratio.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
                      if (!m) return { aspectRatio: '1 / 1' as const };
                      return { aspectRatio: `${m[1]} / ${m[2]}` };
                    })();
                    const url = mediaMap.get(t.key) ?? (t.kind === 'image' ? draft.mediaUrls[0] : undefined);
                    return (
                      <li key={t.key} className="rounded-xl border border-black/10 bg-warm-bg/20 p-2.5">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="inline-flex items-center justify-center w-3.5 h-3.5 text-foreground/65">
                            <PlatformIcon platform={activeTab} size={12} />
                          </span>
                          <span className="text-[11px] font-semibold text-foreground truncate">{PLATFORM_LABELS[activeTab] ?? activeTab}</span>
                          <span className={`ml-auto text-[8.5px] font-semibold uppercase tracking-wider ${t.kind === 'video' ? 'text-rose-600' : 'text-emerald-700'}`}>{t.kind}</span>
                        </div>
                        <div className={`w-full rounded-md overflow-hidden ${url ? '' : 'border-2 border-dashed border-black/15 bg-white'}`} style={ratioStyle}>
                          {url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={url} alt="" className="w-full h-full object-cover" />
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
          </>
        )}

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

      {/* Sticky save bar — instructions on the left, gated Save on the
          right. Saving marks the post Ready to go. */}
      {(() => {
        const missing: string[] = [];
        if (!draft.caption.trim()) missing.push('add a caption');
        if (draft.mediaUrls.length === 0) missing.push('add media');
        if (platforms.length === 0) missing.push('pick a target platform');
        if (allKeys.filter((k) => selectedSet.has(k)).length === 0) missing.push('check a deliverable');
        const canSave = missing.length === 0;
        return (
          <div className="sticky bottom-0 z-10 mt-6 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 py-3 bg-white/90 backdrop-blur border-t border-black/10 flex items-center justify-between gap-4">
            <p className="min-w-0 text-[12px] text-foreground/60" style={{ fontFamily: 'var(--font-body)' }}>
              {draft.ready ? (
                <span className="text-emerald-700 font-semibold">✓ Saved as Ready to go.</span>
              ) : canSave ? (
                <span>Everything&apos;s in place — save to mark this post <strong className="text-foreground/80">Ready to go</strong>.</span>
              ) : (
                <span>To make it ready: <span className="font-semibold text-foreground/80">{missing.join(' · ')}</span>.</span>
              )}
            </p>
            <button
              type="button"
              disabled={!canSave || draft.ready}
              onClick={() => { if (canSave && !draft.ready) void updateDraft(draft.id, { ready: true }); }}
              className={`shrink-0 px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                draft.ready
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                  : canSave
                  ? 'bg-primary text-white hover:bg-primary-dark'
                  : 'bg-foreground/10 text-foreground/40 cursor-not-allowed'
              }`}
            >
              {draft.ready ? 'Saved ✓' : 'Save ready-to-go post'}
            </button>
          </div>
        );
      })()}
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
