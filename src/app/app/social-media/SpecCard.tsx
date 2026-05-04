'use client';

import { PlatformIcon, PLATFORM_LABELS, PLATFORM_BRAND_COLORS, type PlatformId } from './PlatformIcon';
import { PLATFORM_SPECS, type PlatformSpec, type MediaSpec, type VideoSpec } from './platform-specs';

// SpecCard — the deliverable spec for a single platform rendered as a
// scannable panel. Driven entirely by PLATFORM_SPECS; this component
// only handles layout. Used inside the platform-specific composer
// (phases 8–17) so the admin can see "what does Pinterest expect of
// this post?" without leaving the compose flow, and on its own as a
// quick reference panel above the platform picker (phase 6).

interface SpecCardProps {
  platform: PlatformId;
  /** Compact mode trims long sections and hides the docs link.
   *  Useful when the card is rendered inline next to a form. */
  compact?: boolean;
}

export function SpecCard({ platform, compact = false }: SpecCardProps) {
  const spec = PLATFORM_SPECS[platform];
  const brand = PLATFORM_BRAND_COLORS[platform];

  return (
    <div
      className="rounded-2xl border border-black/10 bg-white overflow-hidden"
      style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.02)' }}
    >
      {/* Header — brand strip with logo + platform name + a thin accent
          bar in the brand color so the card reads as "this is what
          Pinterest needs" without reading the title. */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-black/5"
        style={{ background: `linear-gradient(0deg, transparent 0%, ${brand}10 100%)` }}
      >
        <PlatformIcon platform={platform} size={22} />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground">{PLATFORM_LABELS[platform]}</h3>
          <p className="text-[11px] text-foreground/55">Deliverable spec</p>
        </div>
        {!compact && spec.ayrshareDocs && (
          <a
            href={spec.ayrshareDocs}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-foreground/45 hover:text-primary underline decoration-dotted"
          >
            Ayrshare docs ↗
          </a>
        )}
      </div>

      <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
        <SpecGroup label="Text">
          <SpecLine
            term={spec.textLabel}
            value={`up to ${spec.textMax.toLocaleString()} chars`}
            hint={spec.textRecommended}
          />
          {spec.hasSeparateTitle && spec.titleMax != null && (
            <SpecLine term="Title" value={`up to ${spec.titleMax.toLocaleString()} chars`} />
          )}
          {spec.descriptionMax != null && spec.descriptionMax !== spec.textMax && (
            <SpecLine term="Description" value={`up to ${spec.descriptionMax.toLocaleString()} chars`} />
          )}
          <SpecLine
            term="Hashtags"
            value={
              spec.hashtagMax != null
                ? `${spec.hashtagRecommended ?? '—'} recommended · ${spec.hashtagMax} max`
                : spec.hashtagRecommended != null
                ? `${spec.hashtagRecommended} recommended`
                : 'platform-dependent'
            }
          />
          <SpecLine
            term="Links in caption"
            value={spec.linksClickable ? 'clickable' : 'NOT clickable'}
            tone={spec.linksClickable ? 'ok' : 'warn'}
          />
        </SpecGroup>

        <SpecGroup label="Media">
          <SpecLine
            term="Per-post limit"
            value={
              spec.mediaCountMax != null
                ? `${spec.mediaCountMax} item${spec.mediaCountMax === 1 ? '' : 's'}`
                : 'no fixed cap'
            }
          />
          {spec.mediaRequired && (
            <SpecLine term="Media" value="required (text-only posts not supported)" tone="warn" />
          )}
          {spec.images.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-foreground/45 font-semibold mt-1.5 mb-1">Images</p>
              <ul className="space-y-1">
                {spec.images.slice(0, compact ? 2 : spec.images.length).map((img) => (
                  <MediaLine key={img.label} item={img} />
                ))}
              </ul>
            </div>
          )}
          {spec.videos.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-foreground/45 font-semibold mt-1.5 mb-1">Video</p>
              <ul className="space-y-1">
                {spec.videos.slice(0, compact ? 2 : spec.videos.length).map((vid) => (
                  <VideoLine key={vid.label} item={vid} />
                ))}
              </ul>
            </div>
          )}
        </SpecGroup>

        {spec.ctas && spec.ctas.length > 0 && (
          <SpecGroup label="CTA buttons">
            <div className="flex flex-wrap gap-1.5">
              {spec.ctas.map((c) => (
                <span
                  key={c.value}
                  className="inline-flex items-center rounded-full bg-warm-bg/70 border border-black/5 px-2 py-0.5 text-[11px] text-foreground/80"
                  title={c.value}
                >
                  {c.label}
                </span>
              ))}
            </div>
          </SpecGroup>
        )}

        <SpecGroup label="Notes" className="md:col-span-2">
          <ul className="space-y-1 text-[12px] text-foreground/70 leading-relaxed list-disc pl-4">
            {spec.notes.slice(0, compact ? 3 : spec.notes.length).map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </SpecGroup>
      </div>
    </div>
  );
}

function SpecGroup({
  label, children, className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/40 mb-1.5">{label}</p>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function SpecLine({
  term, value, hint, tone,
}: {
  term: string;
  value: string;
  hint?: string;
  tone?: 'ok' | 'warn';
}) {
  const valueClass =
    tone === 'warn' ? 'text-amber-700 font-semibold'
    : tone === 'ok' ? 'text-emerald-700 font-semibold'
    : 'text-foreground/85 font-medium';
  return (
    <div className="flex items-baseline gap-2 text-[12px]">
      <span className="text-foreground/55 shrink-0">{term}:</span>
      <span className={`${valueClass} flex-1 min-w-0`}>{value}</span>
      {hint && <span className="text-[10px] text-foreground/45 italic shrink-0">{hint}</span>}
    </div>
  );
}

function MediaLine({ item }: { item: MediaSpec }) {
  return (
    <li className="text-[12px] text-foreground/75 leading-snug">
      <span className="font-medium text-foreground/85">{item.label}</span>
      {item.size && <span className="text-foreground/50"> · {item.size}</span>}
      {item.maxFileSize && <span className="text-foreground/45"> · ≤{item.maxFileSize}</span>}
      {item.notes && <p className="text-[11px] text-foreground/45 mt-0.5">{item.notes}</p>}
    </li>
  );
}

function VideoLine({ item }: { item: VideoSpec }) {
  const length =
    item.minSeconds != null && item.maxSeconds != null
      ? `${item.minSeconds}–${item.maxSeconds}s`
      : item.maxSeconds != null
      ? `≤${item.maxSeconds}s`
      : null;
  return (
    <li className="text-[12px] text-foreground/75 leading-snug">
      <span className="font-medium text-foreground/85">{item.label}</span>
      {item.size && <span className="text-foreground/50"> · {item.size}</span>}
      {length && <span className="text-foreground/50"> · {length}</span>}
      {item.notes && <p className="text-[11px] text-foreground/45 mt-0.5">{item.notes}</p>}
    </li>
  );
}

/** Console.log a platform's full spec in a structured way. Called by
 *  the platform picker (phase 6) when the user clicks into a specific
 *  platform — gives the admin / dev a copy-pasteable look at every
 *  field the post can carry, even fields the form doesn't surface. */
export function logPlatformSpec(platform: PlatformId): void {
  const spec: PlatformSpec = PLATFORM_SPECS[platform];
  console.groupCollapsed(`%c${PLATFORM_LABELS[platform]} %cdeliverable spec`,
    `color: ${PLATFORM_BRAND_COLORS[platform]}; font-weight: bold;`,
    'color: #888; font-weight: normal;');
  console.log('Text:', {
    label: spec.textLabel,
    max: spec.textMax,
    recommended: spec.textRecommended,
    titleMax: spec.titleMax,
    descriptionMax: spec.descriptionMax,
  });
  console.log('Hashtags:', { recommended: spec.hashtagRecommended, max: spec.hashtagMax });
  console.log('Links clickable:', spec.linksClickable);
  console.log('Media:', {
    countMax: spec.mediaCountMax,
    required: !!spec.mediaRequired,
  });
  if (spec.images.length > 0) console.log('Images:', spec.images);
  if (spec.videos.length > 0) console.log('Video:', spec.videos);
  if (spec.ctas) console.log('CTA buttons:', spec.ctas);
  console.log('Notes:', spec.notes);
  if (spec.ayrshareDocs) console.log('Docs:', spec.ayrshareDocs);
  console.groupEnd();
}
