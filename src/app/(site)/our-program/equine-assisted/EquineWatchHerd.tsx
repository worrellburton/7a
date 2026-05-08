'use client';

import { useEffect, useRef, useState } from 'react';

interface PublicHorse {
  id: string;
  name: string;
  age: number | null;
  works_in: string | null;
  image_url: string | null;
  video_url: string | null;
}

/**
 * Phase 8 — "Watch the herd" video reel. A page-level section that
 * surfaces every horse with a video_url uploaded via the admin
 * /app/equine/[id] panel. Layout is a responsive 2/3-column grid of
 * silent muted clips that auto-play on hover (desktop) or tap
 * (mobile), each captioned with the horse's name + role.
 *
 * Section auto-hides when no horse has a clip yet, so the public
 * page doesn't render an empty header before any video has been
 * uploaded. As soon as a video lands in the table the reel lights
 * up — no code change needed.
 */
export default function EquineWatchHerd() {
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
          setHorses((data.horses as PublicHorse[]).filter((h) => !!h.video_url));
        } else {
          setHorses([]);
        }
      } catch {
        if (!cancelled) setHorses([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Empty / loading: render nothing rather than flashing a header.
  if (horses === null || horses.length === 0) return null;

  return (
    <section
      ref={ref}
      id="watch-herd"
      className="scroll-mt-20 py-24 lg:py-32 bg-foreground text-white"
      aria-labelledby="watch-herd-heading"
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
          <p className="text-[11px] tracking-[0.24em] uppercase font-semibold text-primary mb-5" style={{ fontFamily: 'var(--font-body)' }}>
            Watch the herd
          </p>
          <h2
            id="watch-herd-heading"
            className="font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Short clips of the horses
            <br className="hidden md:block" />
            <em className="not-italic text-primary">on the ranch</em>.
          </h2>
          <p
            className="text-white/70 text-[16.5px] leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Footage straight from the property — no edits, no music,
            just our horses being themselves between sessions. Hover
            (or tap on mobile) to play.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7">
          {horses.map((h, i) => (
            <HorseClip key={h.id} horse={h} delay={0.2 + i * 0.08} visible={visible} />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * One clip tile. Plays muted on hover for desktop visitors so the
 * grid feels alive when they read down the page; on touch devices
 * the user can tap-to-play through the native control overlay.
 * Poster falls back to image_url so each tile shows a photo of the
 * horse before any video data is fetched / decoded.
 */
function HorseClip({ horse, delay, visible }: { horse: PublicHorse; delay: number; visible: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (hovered) {
      v.currentTime = 0;
      v.play().catch(() => { /* autoplay can be blocked; ignore */ });
    } else {
      v.pause();
    }
  }, [hovered]);

  return (
    <div
      className="group relative rounded-3xl overflow-hidden bg-black/40 ring-1 ring-white/10 hover:ring-white/30 transition-all duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s, box-shadow 500ms`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative aspect-[3/4]">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          src={horse.video_url || undefined}
          poster={horse.image_url || undefined}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          loop
          playsInline
          preload="metadata"
          controls={false}
          aria-label={`Short clip of ${horse.name}, one of the therapy horses at Seven Arrows Recovery`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent pointer-events-none" />

        {/* Play badge — fades out while the clip is rolling so the
            badge doesn't obscure the action. */}
        <div className={`absolute top-4 left-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur text-white text-[10px] font-semibold tracking-wider uppercase transition-opacity duration-300 ${hovered ? 'opacity-0' : 'opacity-100'}`} style={{ fontFamily: 'var(--font-body)' }}>
          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7-4.5z" /></svg>
          Hover to play
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5 lg:p-6">
          <h3
            className="text-white font-bold tracking-tight drop-shadow-md mb-1"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.4rem, 2.4vw, 1.85rem)',
              lineHeight: 1.05,
            }}
          >
            {horse.name}
          </h3>
          {(horse.age != null || horse.works_in) && (
            <p
              className="text-white/85 text-[12.5px] font-medium"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {horse.age != null ? `${horse.age} years` : ''}
              {horse.age != null && horse.works_in ? ' · ' : ''}
              {horse.works_in || ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
