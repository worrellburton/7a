'use client';

// Lightweight "how will it look" preview for the create flow. Not a
// pixel-perfect mock of every network — just enough chrome (avatar, name,
// media at the platform's primary ratio, caption truncated where that
// network hides the rest behind "more", and the link-clickability note) to
// catch a bad crop or a buried hook before anything is queued.

import { useEffect, useState } from 'react';
import { PLATFORM_SPECS } from './platform-specs';
import { PLATFORM_LABELS, aspectStyle } from './deliverables';
import { PlatformIcon, type PlatformId } from './PlatformIcon';

export interface PreviewMedia { url: string; isVideo: boolean }

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

function primaryRatio(pid: PlatformId): string {
  return PLATFORM_SPECS[pid]?.images[0]?.ratio?.split(/\s*[/,]\s*/)[0]?.trim() || '1:1';
}

export function PostPreview({
  caption,
  platforms,
  mediaFor,
}: {
  caption: string;
  platforms: PlatformId[];
  mediaFor: (pid: PlatformId) => PreviewMedia | undefined;
}) {
  const [active, setActive] = useState<PlatformId | null>(platforms[0] ?? null);
  useEffect(() => {
    setActive((cur) => (cur && platforms.includes(cur) ? cur : platforms[0] ?? null));
  }, [platforms]);

  if (platforms.length === 0 || !active) return null;

  const spec = PLATFORM_SPECS[active];
  const media = mediaFor(active);
  const limit = PREVIEW_TRUNCATE[active] ?? 220;
  const truncated = caption.length > limit;
  const shown = truncated ? caption.slice(0, limit).trimEnd() : caption;
  const ratio = primaryRatio(active);

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4 mb-5">
      <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-2">Preview</p>

      {/* Platform tabs — one per selected network. */}
      <div className="flex flex-wrap gap-1.5 mb-3">
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

      {/* Mock post card. */}
      <div className="max-w-[420px] mx-auto rounded-xl border border-black/10 overflow-hidden bg-white shadow-sm">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-warm-bg/70 text-foreground/70">
            <PlatformIcon platform={active} size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold text-foreground leading-tight">Your {PLATFORM_LABELS[active] ?? 'page'}</p>
            <p className="text-[10.5px] text-foreground/45 leading-tight">Sponsored · just now</p>
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
            No media for this network yet
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
