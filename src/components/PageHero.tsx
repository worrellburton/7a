'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { SITE_URL } from '@/lib/seo/schema';

interface MetaItem {
  label: string;
  value: string;
  icon?: 'author' | 'published' | 'modified' | 'reading';
}

// Title can be plain text, or an array of { text, accent } segments so
// callers can highlight a single word in the brand accent color the way
// the inner-page heros do (e.g. "Recovery doesn't end at the gate." with
// "the" in accent).
export type TitleSegment = string | { text: string; accent?: boolean };

interface CtaPhone {
  kind: 'phone';
  /** Tap target — defaults to the main admissions number. */
  href?: string;
  /** Display number, e.g. "(866) 718-1665". */
  display: string;
  /** Eyebrow above the number, e.g. "ALUMNI LINE · 24/7". */
  eyebrow?: string;
}

interface CtaLink {
  kind: 'link';
  href: string;
  label: string;
}

export type HeroCta = CtaPhone | CtaLink;

interface PageHeroProps {
  label: string;
  /** Either a plain string, or an array of segments for accent-word styling. */
  title: string | TitleSegment[];
  description?: string;
  /** Optional smaller, lighter credit/disclaimer line rendered directly
   *  beneath the description (e.g. a model attribution) so it reads as a
   *  footnote without competing with the headline. */
  attribution?: string;
  image?: string;
  /** Optional backdrop video URL — takes precedence over `image`. */
  video?: string;
  /** Breadcrumb links — rendered before the current page title. */
  breadcrumbs?: { label: string; href?: string }[];
  /** Emit BreadcrumbList JSON-LD derived from `breadcrumbs`, for
   *  breadcrumb rich results in search. Defaults true. Pages that
   *  already render their own inline BreadcrumbList pass false so the
   *  page doesn't carry two competing breadcrumb schemas. */
  breadcrumbSchema?: boolean;
  /** Small meta row under the description (author / dates / read time). */
  meta?: MetaItem[];
  /** Optional CTA row under the description — phone pill + text link. */
  ctas?: HeroCta[];
  /** Content column width. "wide" (default) matches marketing pages'
   *  max-w-7xl container; "narrow" uses max-w-3xl so the hero's left
   *  edge lines up with a 3xl reading column beneath it (blog posts). */
  width?: 'wide' | 'narrow';
  /** SEO overrides — swap which slot carries the page's <h1>. The
   *  visual styling stays identical; only the rendered tag changes.
   *  Defaults preserve the legacy behaviour (label as <p>, title as
   *  <h1>). Used by /what-we-treat/* pages that want a keyword-rich
   *  H1 in the eyebrow slot. */
  labelAs?: 'p' | 'h1';
  titleAs?: 'h1' | 'h2' | 'p';
}

// Temporary placeholder backdrop used on every inner page until we
// replace individual pages with their own footage. Looping, muted,
// and preloaded so all inner pages share the same ambient motion.
const DEFAULT_VIDEO =
  'https://xbirikzsrwmgqxlazglm.supabase.co/storage/v1/object/public/public-images/site-videos/9c83abff-3c23-47a6-a407-467dd6d4dec4.mp4';
const DEFAULT_IMAGE = '/hero/facility-exterior-mountains.jpg';

// Hero base paths that have a pre-encoded AVIF sitting next to the
// JPEG fallback in /public/hero/. When `image` resolves to one of
// these, we render a native <picture> with AVIF source + JPEG <img>
// fallback (next/image's auto-format negotiation is disabled site-
// wide via next.config `unoptimized: true`, so the picture element
// is the only way to actually ship AVIF here). Anything else falls
// back to the legacy single-source <Image> path below.
const HERO_AVIF_BASES = new Set([
  '/hero/facility-exterior-mountains',
  '/hero/embrace-connection',
  '/hero/sign-night-sky-milky-way',
  '/hero/sound-healing-session',
  '/hero/group-therapy-room',
  '/hero/covered-porch-desert-view',
  '/hero/common-area-living-room',
  '/hero/equine-therapy-portrait',
  '/hero/group-gathering-pavilion',
  '/hero/horses-grazing',
  '/hero/group-sunset-desert',
  '/hero/individual-therapy-session',
  '/hero/horse-sketch-artwork',
  '/hero/resident-reading-window',
]);

function heroPaths(image: string): { jpg: string; avif: string | null } {
  // Strip extension to derive the base path; only emit an AVIF
  // source when the base is in our pre-encoded allow-list. This
  // guards against pointing at an /hero/ path that has no AVIF
  // counterpart and getting a broken-image render (browsers commit
  // to the matched <source type> even when the URL 404s).
  const base = image.replace(/\.(jpe?g|png|webp|avif)$/i, '');
  const avif = HERO_AVIF_BASES.has(base) ? `${base}.avif` : null;
  return { jpg: image, avif };
}

function MetaIcon({ kind }: { kind: MetaItem['icon'] }) {
  const common = 'w-3.5 h-3.5';
  switch (kind) {
    case 'author':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21v-1a7 7 0 0114 0v1" />
        </svg>
      );
    case 'published':
    case 'modified':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case 'reading':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    default:
      return null;
  }
}

function PhoneIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

function LiveDot() {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
      <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-primary" />
    </span>
  );
}

function renderTitle(title: PageHeroProps['title']) {
  if (typeof title === 'string') return title;
  return title.map((seg, i) => {
    if (typeof seg === 'string') return <span key={i}>{seg}</span>;
    return seg.accent ? (
      <em
        key={i}
        className="not-italic"
        style={{ color: 'var(--color-accent)' }}
      >
        {seg.text}
      </em>
    ) : (
      <span key={i}>{seg.text}</span>
    );
  });
}

function HeroCtaRow({ ctas }: { ctas: HeroCta[] }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-7 gap-y-3">
      {ctas.map((c, i) => {
        if (c.kind === 'phone') {
          return (
            <a
              key={i}
              href={c.href || 'tel:+18667181665'}
              className="inline-flex items-center gap-3 bg-primary hover:bg-primary-dark transition-colors rounded-full pl-3.5 pr-5 py-3 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.45)] ring-1 ring-white/10"
            >
              <span className="relative inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/12 ring-1 ring-white/15">
                <PhoneIcon className="w-4 h-4 text-white" />
                <span className="absolute -top-0.5 -right-0.5">
                  <LiveDot />
                </span>
              </span>
              <span className="flex flex-col items-start leading-tight text-left">
                {c.eyebrow && (
                  <span
                    className="text-[10px] font-semibold tracking-[0.18em] uppercase text-white/75"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {c.eyebrow}
                  </span>
                )}
                <span
                  className="text-white font-bold text-base sm:text-lg tracking-tight"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {c.display}
                </span>
              </span>
            </a>
          );
        }
        // Secondary text link with underline rule
        return (
          <Link
            key={i}
            href={c.href}
            className="text-white text-[12px] font-semibold tracking-[0.22em] uppercase border-b border-white/40 hover:border-white pb-1 transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {c.label}
          </Link>
        );
      })}
    </div>
  );
}

export default function PageHero({
  label,
  title,
  description,
  attribution,
  image,
  video = DEFAULT_VIDEO,
  breadcrumbs,
  breadcrumbSchema = true,
  meta,
  ctas,
  width = 'wide',
  labelAs = 'p',
  titleAs = 'h1',
}: PageHeroProps) {
  // A `video` (defaulted) takes precedence. Callers can still pass an
  // explicit `image` to opt out of the shared placeholder clip.
  const posterImage = image ?? DEFAULT_IMAGE;
  const useVideo = Boolean(video);
  const videoRef = useRef<HTMLVideoElement>(null);

  // BreadcrumbList structured data, derived from the same `breadcrumbs`
  // we render visually — so Google can show a breadcrumb trail in the
  // result. The leaf crumb (current page) carries no `item` URL, which
  // is valid per schema.org and what Google expects for the last node.
  const breadcrumbJsonLd =
    breadcrumbSchema && breadcrumbs && breadcrumbs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: breadcrumbs.map((crumb, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: crumb.label,
            ...(crumb.href
              ? {
                  item: crumb.href.startsWith('http')
                    ? crumb.href
                    : `${SITE_URL}${crumb.href}`,
                }
              : {}),
          })),
        }
      : null;

  // The `autoPlay` attribute alone is flaky on some mobile browsers and
  // with Next's streaming hydration — explicitly calling play() after
  // mount (muted + playsInline) is what actually starts the loop on
  // every inner page. Swallow the promise rejection: iOS low-power mode
  // blocks autoplay and we just let the poster show in that case.
  useEffect(() => {
    if (!useVideo) return;
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    el.play().catch(() => {});
  }, [useVideo, video]);

  return (
    <section
      className="relative overflow-hidden bg-dark-section text-white"
      // Extend up under the transparent sticky nav, same approach as
      // the homepage hero. site-header-height is set on the <header>.
      style={{ marginTop: 'calc(var(--site-header-height, 68px) * -1)' }}
    >
      {/* Background media — video backdrop is the default placeholder
          so every inner page shares the same ambient Arizona motion.
          Pages that pass an explicit `image` fall back to a still. */}
      {useVideo ? (
        <video
          ref={videoRef}
          src={video}
          poster={posterImage}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden="true"
        />
      ) : (
        // Hero poster. next.config has `images: { unoptimized: true }`
        // site-wide so next/image never re-encodes anything; the only
        // way to actually deliver AVIF here is a hand-rolled <picture>
        // with the AVIF source + a JPEG <img> fallback. Both files are
        // pre-encoded at build time by scripts/_encode-heroes.mjs and
        // committed to /public/hero/ alongside the JPEG. AVIF is ~75%
        // smaller than the source JPEG at hero scale (519 KB → 119 KB
        // for facility-exterior-mountains, 370 KB → 93 KB for embrace-
        // connection) which is the bulk of the LCP win.
        //
        // fetchPriority='high' + loading='eager' + decoding='async'
        // mirror what next/image's `priority` would have done if the
        // optimizer were enabled; on this site we set them explicitly.
        // sizes='100vw' communicates the intrinsic width back to the
        // browser preload scanner so the right variant is requested.
        // Width + height are set so the browser can reserve the right
        // aspect-ratio box before the bytes arrive, avoiding CLS even
        // though the element is absolutely positioned with object-cover.
        (() => {
          const { jpg, avif } = heroPaths(posterImage);
          return (
            <picture className="absolute inset-0 block w-full h-full" aria-hidden="true">
              {avif && <source srcSet={avif} type="image/avif" sizes="100vw" />}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={jpg}
                alt=""
                width={1920}
                height={1080}
                sizes="100vw"
                // @ts-expect-error fetchPriority is valid HTML on img
                // but React's TS types lag the spec on older versions.
                fetchpriority="high"
                loading="eager"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </picture>
          );
        })()
      )}

      {/* Scrim — darker at the bottom so breadcrumb + title read cleanly
          regardless of what's playing in the video. */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(180deg, rgba(20,10,6,0.45) 0%, rgba(20,10,6,0.55) 40%, rgba(20,10,6,0.78) 100%)',
        }}
      />

      <div
        className={`relative z-10 ${width === 'narrow' ? 'max-w-[1000px]' : 'max-w-7xl'} mx-auto px-4 sm:px-6 lg:px-8`}
        style={{ paddingTop: 'calc(var(--site-header-height, 68px) + 2.5rem)' }}
      >
        <div className="pb-16 lg:pb-24 min-h-[380px] lg:min-h-[440px] flex flex-col justify-end">
          {breadcrumbJsonLd && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />
          )}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav
              aria-label="Breadcrumb"
              className="mb-5 text-[11px] tracking-[0.18em] uppercase font-semibold text-white/70"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <ol className="flex items-center gap-2 flex-wrap">
                {breadcrumbs.map((crumb, i) => (
                  <li key={i} className="flex items-center gap-2">
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="text-primary hover:text-white transition-colors"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-white/80">{crumb.label}</span>
                    )}
                    {i < breadcrumbs.length - 1 && <span className="text-white/40">/</span>}
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {/* Eyebrow row. Renders as <p> by default; pages that want
              this slot to carry the H1 (titleAs='h2' pages) pass
              labelAs='h1' so the markup-level hierarchy is correct
              without changing the visual styling. */}
          {labelAs === 'h1' ? (
            <h1
              className="flex items-center gap-4 text-[11px] tracking-[0.22em] uppercase font-semibold text-white/80 mb-4"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <span className="block w-10 h-px bg-white/70" aria-hidden="true" />
              {label}
            </h1>
          ) : (
            <p
              className="flex items-center gap-4 text-[11px] tracking-[0.22em] uppercase font-semibold text-white/80 mb-4"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <span className="block w-10 h-px bg-white/70" aria-hidden="true" />
              {label}
            </p>
          )}

          {titleAs === 'h2' ? (
            <h2
              className="text-4xl sm:text-5xl lg:text-[4rem] font-bold tracking-tight leading-[1.05] mb-5"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {renderTitle(title)}
            </h2>
          ) : titleAs === 'p' ? (
            <p
              className="text-4xl sm:text-5xl lg:text-[4rem] font-bold tracking-tight leading-[1.05] mb-5"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {renderTitle(title)}
            </p>
          ) : (
            <h1
              className="text-4xl sm:text-5xl lg:text-[4rem] font-bold tracking-tight leading-[1.05] mb-5"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {renderTitle(title)}
            </h1>
          )}

          {description && (
            <p
              className="text-white/80 leading-relaxed max-w-3xl text-base lg:text-lg mb-6"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {description}
            </p>
          )}

          {attribution && (
            <p
              className="text-white/55 leading-relaxed max-w-3xl text-xs lg:text-sm -mt-3 mb-6"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {attribution}
            </p>
          )}

          {meta && meta.length > 0 && (
            <ul
              className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-white/70"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {meta.map((m, i) => (
                <li key={i} className="flex items-center gap-2">
                  {m.icon && (
                    <span className="text-white/60">
                      <MetaIcon kind={m.icon} />
                    </span>
                  )}
                  <span className="font-semibold text-white/80">{m.label}:</span>
                  <span>{m.value}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Phone CTAs in the hero were duplicating the fixed bottom
              sticky-phone pill. Strip them here so only non-phone CTAs
              (BEGIN ADMISSIONS, verify insurance, etc.) render in the
              hero row. */}
          {ctas && ctas.filter((c) => c.kind !== 'phone').length > 0 && (
            <HeroCtaRow ctas={ctas.filter((c) => c.kind !== 'phone')} />
          )}
        </div>
      </div>
    </section>
  );
}
