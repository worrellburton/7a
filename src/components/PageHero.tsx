'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

interface MetaItem {
  label: string;
  value: string;
  icon?: 'author' | 'published' | 'modified' | 'reading';
}

interface PageHeroProps {
  label: string;
  title: string;
  description?: string;
  image?: string;
  /** Optional backdrop video URL — takes precedence over `image`. */
  video?: string;
  /** Breadcrumb links — rendered before the current page title. */
  breadcrumbs?: { label: string; href?: string }[];
  /** Small meta row under the description (author / dates / read time). */
  meta?: MetaItem[];
}

// Temporary placeholder backdrop used on every inner page until we
// replace individual pages with their own footage. Looping, muted,
// and preloaded so all inner pages share the same ambient motion.
const DEFAULT_VIDEO =
  'https://xbirikzsrwmgqxlazglm.supabase.co/storage/v1/object/public/public-images/site-videos/9c83abff-3c23-47a6-a407-467dd6d4dec4.mp4';
const DEFAULT_IMAGE = '/images/facility-exterior-mountains.jpg';

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

export default function PageHero({
  label,
  title,
  description,
  image,
  video = DEFAULT_VIDEO,
  breadcrumbs,
  meta,
}: PageHeroProps) {
  // A `video` (defaulted) takes precedence. Callers can still pass an
  // explicit `image` to opt out of the shared placeholder clip.
  const posterImage = image ?? DEFAULT_IMAGE;
  const useVideo = Boolean(video);
  const videoRef = useRef<HTMLVideoElement>(null);

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
        <img
          src={posterImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          aria-hidden="true"
        />
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
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        style={{ paddingTop: 'calc(var(--site-header-height, 68px) + 2.5rem)' }}
      >
        <div className="pb-16 lg:pb-24 min-h-[380px] lg:min-h-[440px] flex flex-col justify-end">
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

          <p
            className="flex items-center gap-4 text-[11px] tracking-[0.22em] uppercase font-semibold text-white/80 mb-4"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <span className="block w-10 h-px bg-white/70" aria-hidden="true" />
            {label}
          </p>

          <h1
            className="text-4xl sm:text-5xl lg:text-[4rem] font-bold tracking-tight leading-[1.05] mb-5"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {title}
          </h1>

          {description && (
            <p
              className="text-white/80 leading-relaxed max-w-3xl text-base lg:text-lg mb-6"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {description}
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
        </div>
      </div>
    </section>
  );
}
