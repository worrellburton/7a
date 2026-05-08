'use client';

import { useEffect, useRef, useState } from 'react';

interface PublicHorse {
  id: string;
  name: string;
  age: number | null;
  works_in: string | null;
  rideable: string | null;
  notes: string | null;
  image_url: string | null;
  gallery_urls: string[];
  video_url: string | null;
}

/**
 * Phase 5 — Featured Horses. Three editorial-scale spotlight cards
 * sit above the herd gallery on /our-program/equine-assisted, each
 * showcasing a single horse with a tall portrait, name, role, and a
 * personality blurb. Picked deterministically by content density:
 * horses with a video first, then those with the largest galleries,
 * then alphabetical — so the page leads with the horses we have the
 * most material for. Falls back to the first three horses with a
 * portrait when nobody has extra media yet.
 *
 * Hover lift + slow Ken-Burns on the portrait, plus a soft chip row
 * underneath each card pulling age / role / rideable. Gallery tile
 * count + a "Has video" badge surface when present so the visitor
 * can sense there's more behind the card before they click into the
 * full detail modal in EquineHerd's HorseGallery.
 */
export default function EquineFeatured() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [horses, setHorses] = useState<PublicHorse[] | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/public/horses');
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && Array.isArray(data?.horses)) {
          setHorses(data.horses as PublicHorse[]);
        } else {
          setHorses([]);
        }
      } catch {
        if (!cancelled) setHorses([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Pick 3 featured horses by content density. Video > big gallery >
  // any gallery > has notes > alphabetical. Stable ordering on
  // ties so the page doesn't shuffle on each render.
  const featured = (horses ?? [])
    .filter((h) => h.image_url)
    .map((h) => ({
      h,
      score:
        (h.video_url ? 1000 : 0) +
        (h.gallery_urls?.length || 0) * 30 +
        ((h.notes || '').trim() ? 5 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.h.name.localeCompare(b.h.name))
    .slice(0, 3)
    .map((x) => x.h);

  // Don't render the section while the fetch is in flight or when
  // the herd has no public-ready entries — avoids flashing an empty
  // "Featured" header on first paint.
  if (horses === null || featured.length === 0) return null;

  return (
    <section
      ref={ref}
      id="featured-horses"
      className="scroll-mt-20 py-24 lg:py-28 bg-white"
      aria-labelledby="featured-horses-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-12 lg:mb-14"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">Featured horses</p>
          <h2
            id="featured-horses-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Three of our{' '}
            <em className="not-italic text-primary">teachers</em>.
          </h2>
          <p
            className="text-foreground/70 text-[16.5px] leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Every horse on the ranch carries a different therapeutic
            assignment. These three are some of the herd&rsquo;s most active
            partners in our equine-assisted psychotherapy work — meet them
            below, then scroll on for the full roster.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {featured.map((h, i) => (
            <a
              key={h.id}
              href="#meet-herd"
              className="group relative block rounded-3xl overflow-hidden bg-warm-bg border border-black/5 shadow-sm hover:shadow-xl transition-all duration-500"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(20px)',
                transition: `opacity 0.9s cubic-bezier(0.16,1,0.3,1) ${0.2 + i * 0.1}s, transform 0.9s cubic-bezier(0.16,1,0.3,1) ${0.2 + i * 0.1}s, box-shadow 500ms`,
              }}
              aria-label={`Meet ${h.name}`}
            >
              {/* Portrait — taller than the standard gallery tile to
                  give each featured horse real editorial presence.
                  Slow Ken-Burns on hover signals the card is alive. */}
              <div className="relative aspect-[3/4] overflow-hidden">
                {h.image_url && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={h.image_url}
                    alt={`Portrait of ${h.name}, one of the therapy horses at Seven Arrows Recovery`}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.06]"
                    loading="lazy"
                  />
                )}
                {/* Bottom gradient so the name + chip row reads on
                    bright photos. */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

                {/* Top-right indicators when extra media is present
                    so visitors know the detail modal carries more
                    than the single hero shot. */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5">
                  {h.video_url && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur text-white text-[10px] font-semibold tracking-wider uppercase"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7-4.5z" /></svg>
                      Video
                    </span>
                  )}
                  {h.gallery_urls.length > 0 && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur text-white text-[10px] font-semibold tracking-wider uppercase"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 12 12" aria-hidden="true"><rect x="1" y="1" width="10" height="10" rx="1.5" /><path d="M1 8l3-3 3 3 4-4" /></svg>
                      +{h.gallery_urls.length}
                    </span>
                  )}
                </div>

                {/* Name + chip overlay */}
                <div className="absolute inset-x-0 bottom-0 p-5 lg:p-6">
                  <h3
                    className="text-white font-bold tracking-tight drop-shadow-md mb-2"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(1.5rem, 2.6vw, 2rem)',
                      lineHeight: 1.05,
                    }}
                  >
                    {h.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {h.age != null && (
                      <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-white/90 text-foreground tracking-wide" style={{ fontFamily: 'var(--font-body)' }}>
                        {h.age} yrs
                      </span>
                    )}
                    {h.works_in && (
                      <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-primary/90 text-white tracking-wide" style={{ fontFamily: 'var(--font-body)' }}>
                        {h.works_in}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Personality blurb under the portrait — tilted toward
                  what the horse OFFERS in session, not status. Falls
                  back to a clean role line if no notes are filled in. */}
              <div className="p-5 lg:p-6">
                <p
                  className="text-sm text-foreground/75 leading-relaxed line-clamp-4"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {(h.notes && h.notes.trim()) || `${h.name} works with us in ${h.works_in || 'the herd'} as part of our equine-assisted psychotherapy and trail riding programs.`}
                </p>
                <span
                  className="inline-flex items-center gap-1 mt-4 text-xs font-semibold text-primary"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Meet the full herd
                  <svg className="w-3 h-3 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 6h6m-2-2 2 2-2 2" /></svg>
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
