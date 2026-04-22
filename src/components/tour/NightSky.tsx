'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Tour — Phase 8. Full-bleed Milky Way hero with a reverent serif
 * quote overlay. A layer of slow-twinkling CSS "stars" is seeded
 * client-side once the section mounts, adding motion to a still
 * photo without the cost of a video.
 */

type Star = { x: number; y: number; r: number; d: number; delay: number };

function seedStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * 100,
      y: Math.random() * 62,
      r: 0.5 + Math.random() * 1.3,
      d: 2 + Math.random() * 3.5,
      delay: Math.random() * 4,
    });
  }
  return stars;
}

export default function NightSky() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    setStars(seedStars(70));
  }, []);

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
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden text-white min-h-[80vh] lg:min-h-[90vh] flex items-center"
      aria-labelledby="night-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/images/sign-night-sky-milky-way.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(6,4,10,0.4) 0%, rgba(6,4,10,0.2) 40%, rgba(6,4,10,0.85) 100%)',
        }}
      />

      {/* Seeded twinkle layer */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        {stars.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.r}px`,
              height: `${s.r}px`,
              opacity: 0.8,
              boxShadow: '0 0 6px rgba(255,255,255,0.8)',
              animation: `twinkleStar ${s.d}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}
        <style>{`
          @keyframes twinkleStar {
            0%,100% { opacity: 0.15; transform: scale(0.7); }
            50% { opacity: 1; transform: scale(1.1); }
          }
        `}</style>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-24 lg:py-32">
        <p
          className="text-[11px] font-semibold tracking-[0.28em] uppercase text-accent mb-6"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s',
          }}
        >
          After Sundown
        </p>
        <h2
          id="night-heading"
          className="font-bold tracking-tight mb-8"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.6rem, 5.5vw, 4.6rem)',
            lineHeight: 1.03,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(18px)',
            transition: 'all 1.05s cubic-bezier(0.16,1,0.3,1) 0.25s',
          }}
        >
          At Seven Arrows, the nights <em className="not-italic" style={{ color: 'var(--color-accent)' }}>look like this</em>.
        </h2>
        <p
          className="text-white/85 text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 1s ease 0.5s',
          }}
        >
          No city light for miles. The ranch sits under an unbroken Milky Way
          every clear night — the kind of sky that resets what&rsquo;s possible.
        </p>
        <p
          className="mt-10 text-[10px] uppercase tracking-[0.28em] text-white/55 font-semibold"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 1s ease 0.85s',
          }}
        >
          Cochise County, Arizona &nbsp;·&nbsp; Dark-Sky horizon
        </p>
      </div>
    </section>
  );
}
