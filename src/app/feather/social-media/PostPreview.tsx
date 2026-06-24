'use client';

// Lightweight "how will it look" preview for the create flow. Not a
// pixel-perfect mock of every network — just enough chrome (avatar, name,
// media at the selected deliverable's ratio, caption truncated where that
// network hides the rest behind "more", and the link-clickability note) to
// catch a bad crop or a buried hook before anything is queued.
//
// Driven by the ENABLED deliverables (not just the selected networks): a
// network with no checked deliverable doesn't appear, and each surface
// previews at its own aspect ratio (a Story shows 9:16, a feed Post 1:1).

import { useEffect, useMemo, useState } from 'react';
import { PLATFORM_SPECS } from './platform-specs';
import { PLATFORM_LABELS, SURFACE_LABEL, aspectStyle, type DeliverableSurface } from './deliverables';
import { PlatformIcon, type PlatformId } from './PlatformIcon';

export interface PreviewMedia { url: string; isVideo: boolean }

export interface PreviewDeliverable {
  key: string;
  platform: PlatformId;
  surface: DeliverableSurface;
  kind: 'image' | 'video';
  ratio: string;
}

// Where each network collapses the caption behind a "more" affordance.
const PREVIEW_TRUNCATE: Partial<Record<PlatformId, number>> = {
  instagram: 125,
  facebook: 250,
  linkedin: 210,
  twitter: 280,
  threads: 280,
  youtube: 100,
  tiktok: 100,
  bluesky: 300,
};

// First atomic ratio of a possibly-compound spec ("1:1 / 4:5" → "1:1").
function firstRatio(ratio: string): string {
  return ratio?.split(/\s*[/,]\s*/)[0]?.trim() || '1:1';
}

export function PostPreview({
  caption,
  deliverables,
  mediaFor,
}: {
  caption: string;
  deliverables: PreviewDeliverable[];
  mediaFor: (key: string) => PreviewMedia | undefined;
}) {
  // Networks that actually have an enabled deliverable, in first-seen order.
  const platforms = useMemo(() => {
    const seen: PlatformId[] = [];
    for (const d of deliverables) if (!seen.includes(d.platform)) seen.push(d.platform);
    return seen;
  }, [deliverables]);

  const [active, setActive] = useState<PlatformId | null>(platforms[0] ?? null);
  useEffect(() => {
    setActive((cur) => (cur && platforms.includes(cur) ? cur : platforms[0] ?? null));
  }, [platforms]);

  // The enabled deliverables for the active network, plus which one is being
  // previewed (default to the feed "post" surface when present).
  const activeDeliverables = useMemo(
    () => deliverables.filter((d) => d.platform === active),
    [deliverables, active],
  );
  const [activeKey, setActiveKey] = useState<string | null>(null);
  useEffect(() => {
    setActiveKey((cur) => {
      if (cur && activeDeliverables.some((d) => d.key === cur)) return cur;
      const post = activeDeliverables.find((d) => d.surface === 'post');
      return (post ?? activeDeliverables[0])?.key ?? null;
    });
  }, [activeDeliverables]);

  if (platforms.length === 0 || !active) return null;

  const current = activeDeliverables.find((d) => d.key === activeKey) ?? activeDeliverables[0];
  const spec = PLATFORM_SPECS[active];
  const media = current ? mediaFor(current.key) : undefined;
  const limit = PREVIEW_TRUNCATE[active] ?? 220;
  const truncated = caption.length > limit;
  const shown = truncated ? caption.slice(0, limit).trimEnd() : caption;
  const ratio = firstRatio(current?.ratio ?? '1:1');

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4 mb-5">
      <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-2">Preview</p>

      {/* Platform tabs — one per network with an enabled deliverable. */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {platforms.map((pid) => {
          const on = active === pid;
          return (
            <button
              key={pid}
              type="button"
              onClick={() => setActive(pid)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-colors ${on ? 'bg-foreground text-white border-foreground' : 'bg-white text-foreground/60 border-black/10 hover:bg-warm-bg/60'}`}
            >
              <span className="inline-flex items-center justify-center w-3.5 h-3.5"><PlatformIcon platform={pid} size={12} /></span>
              {PLATFORM_LABELS[pid] ?? pid}
            </button>
          );
        })}
      </div>

      {/* Surface sub-tabs — only when the active network has more than one
          enabled deliverable, so the marketer can preview each ratio. */}
      {activeDeliverables.length > 1 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {activeDeliverables.map((d) => {
            const on = d.key === current?.key;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => setActiveKey(d.key)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10.5px] font-semibold transition-colors ${on ? 'bg-primary/10 text-primary border-primary/40' : 'bg-white text-foreground/55 border-black/10 hover:bg-warm-bg/60'}`}
                title={`${SURFACE_LABEL[d.surface]} ${d.kind === 'video' ? 'video' : 'photo'} · ${firstRatio(d.ratio)}`}
              >
                {SURFACE_LABEL[d.surface]}
                {d.kind === 'video' && <span className="text-[8px] uppercase tracking-wide opacity-70">vid</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Mock post card. */}
      <div className="max-w-[420px] mx-auto rounded-xl border border-black/10 overflow-hidden bg-white shadow-sm">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-warm-bg/70 text-foreground/70">
            <PlatformIcon platform={active} size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold text-foreground leading-tight">Your {PLATFORM_LABELS[active] ?? 'page'}</p>
            <p className="text-[10.5px] text-foreground/45 leading-tight">
              Sponsored · just now{current ? ` · ${SURFACE_LABEL[current.surface]} (${ratio})` : ''}
            </p>
          </div>
        </div>

        {media ? (
          <div className="w-full bg-black/[0.03]" style={aspectStyle(ratio)}>
            {media.isVideo ? (
              <video src={media.url} muted playsInline className="w-full h-full object-cover bg-black" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={media.url} alt="" className="w-full h-full object-cover" />
            )}
          </div>
        ) : (
          <div className="w-full flex items-center justify-center text-[11px] text-foreground/35 bg-warm-bg/30" style={aspectStyle(ratio)}>
            No media for this deliverable yet
          </div>
        )}

        <div className="px-3 py-2.5">
          {shown ? (
            <p className="text-[12.5px] text-foreground/85 whitespace-pre-line leading-snug" style={{ fontFamily: 'var(--font-body)' }}>
              {shown}
              {truncated && <span className="text-foreground/40">… <span className="font-semibold">more</span></span>}
            </p>
          ) : (
            <p className="text-[12px] text-foreground/35 italic" style={{ fontFamily: 'var(--font-body)' }}>No caption yet.</p>
          )}
          {spec && !spec.linksClickable && /https?:\/\//i.test(caption) && (
            <p className="mt-1.5 text-[10.5px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 inline-block">
              Links aren’t clickable on {PLATFORM_LABELS[active] ?? active}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
