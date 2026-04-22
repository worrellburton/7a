'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Tour — Phase 5. Big editorial gallery. CSS columns masonry keeps
 * each photo's natural aspect ratio; every tile reveals its alt-text
 * caption on hover over a warm gradient. Lightbox on click.
 *
 * The gallery is wider than the rest of the page — max-w-[1600px] —
 * so the photos actually feel big instead of packaged into cards.
 */

type Shot = { src: string; alt: string; caption: string };

const shots: Shot[] = [
  { src: '/images/facility-exterior-mountains.jpg', alt: 'Facility exterior', caption: 'Main residence at first light' },
  { src: '/images/horses-grazing.jpg', alt: 'Horses grazing', caption: 'The herd, grazing before morning sessions' },
  { src: '/images/group-sunset-desert.jpg', alt: 'Group at sunset', caption: 'Sunset gathering on the ridgeline' },
  { src: '/images/bedroom-shared.jpg', alt: 'Shared bedroom', caption: 'A home-like shared residence' },
  { src: '/images/campfire-ceremony-circle.webp', alt: 'Ceremony circle', caption: 'Evening talking circle & ceremony' },
  { src: '/images/covered-porch-desert-view.jpg', alt: 'Covered porch', caption: 'The porches where hard conversations finally happen' },
  { src: '/images/sound-healing-session.jpg', alt: 'Sound healing', caption: 'Sound healing with singing bowls' },
  { src: '/images/equine-therapy-portrait.jpg', alt: 'Equine therapy', caption: 'One client, one horse, for the whole stay' },
  { src: '/images/common-area-living-room.jpg', alt: 'Living room', caption: 'Common-area living room' },
  { src: '/images/group-gathering-pavilion.jpg', alt: 'Evening gathering', caption: 'Evening community gathering under the pavilion' },
  { src: '/images/individual-therapy-session.jpg', alt: 'Individual therapy', caption: '1:1 trauma-informed therapy' },
  { src: '/images/resident-reading-window.jpg', alt: 'Resident reading', caption: 'Afternoons the sun reaches every window' },
  { src: '/images/horse-sketch-artwork.jpg', alt: 'Artwork', caption: 'Artwork from the herd — drawn by alumni' },
  { src: '/images/group-therapy-room.jpg', alt: 'Group therapy room', caption: 'Light-filled group therapy space' },
  { src: '/images/embrace-connection.jpg', alt: 'Embrace', caption: 'Connection, the moment it arrives' },
  { src: '/images/sign-night-sky-milky-way.jpg', alt: 'Milky Way', caption: 'The sign under an unbroken Milky Way' },
];

export default function TourGallery() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') setLightbox((i) => (i === null ? null : (i + 1) % shots.length));
      if (e.key === 'ArrowLeft') setLightbox((i) => (i === null ? null : (i - 1 + shots.length) % shots.length));
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox]);

  return (
    <>
      <section ref={ref} id="gallery" className="py-24 lg:py-32 bg-white overflow-hidden" aria-labelledby="gallery-heading">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="max-w-3xl mb-14 lg:mb-20"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(14px)',
              transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
            }}
          >
            <p className="section-label mb-5">The Gallery</p>
            <h2
              id="gallery-heading"
              className="text-foreground font-bold tracking-tight"
              style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.2rem, 4.3vw, 3.5rem)', lineHeight: 1.03 }}
            >
              The ranch, <em className="not-italic text-primary">frame by frame</em>.
            </h2>
          </div>

          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 lg:gap-5 [column-fill:_balance]">
            {shots.map((s, i) => (
              <button
                type="button"
                key={s.src}
                onClick={() => setLightbox(i)}
                className="block w-full mb-3 lg:mb-5 break-inside-avoid rounded-xl lg:rounded-2xl overflow-hidden bg-warm-bg group relative text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(18px)',
                  transition: `all 0.75s cubic-bezier(0.16,1,0.3,1) ${0.1 + (i % 8) * 0.06}s`,
                }}
                aria-label={`Open ${s.alt}`}
              >
                <img
                  src={s.src}
                  alt={s.alt}
                  className="w-full h-auto object-cover transition-transform duration-[1000ms] ease-out group-hover:scale-[1.04]"
                  loading="lazy"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(10,5,3,0) 40%, rgba(10,5,3,0.85) 100%)',
                  }}
                />
                <p
                  className="absolute left-4 right-4 bottom-4 text-white text-sm font-semibold translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {s.caption}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {lightbox !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={shots[lightbox].alt}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
          onClick={() => setLightbox(null)}
        >
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            aria-label="Close"
            className="absolute top-5 right-5 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + shots.length) % shots.length); }}
            aria-label="Previous photo"
            className="absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % shots.length); }}
            aria-label="Next photo"
            className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <figure
            className="relative max-w-[92vw] max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={shots[lightbox].src}
              alt={shots[lightbox].alt}
              className="max-w-full max-h-[78vh] object-contain rounded-xl shadow-2xl"
            />
            <figcaption
              className="mt-4 text-white/85 text-sm tracking-wide italic"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {shots[lightbox].caption}
              <span className="mx-2 text-white/35">·</span>
              <span className="text-white/55 not-italic" style={{ fontFamily: 'var(--font-body)' }}>
                {lightbox + 1} / {shots.length}
              </span>
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}
