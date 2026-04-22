'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Tour — Phase 3. Full-bleed facility-exterior photo with slow
 * parallax drift. Overlaid glass intro card on the left anchors the
 * narrative: what the ranch is, why the land matters.
 */
export default function RanchIntro() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [parY, setParY] = useState(0);

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
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const progress = (window.innerHeight / 2 - rect.top) / window.innerHeight;
      setParY(progress * 48);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section ref={ref} className="relative py-32 lg:py-40 text-white overflow-hidden" aria-labelledby="intro-heading">
      <div
        aria-hidden="true"
        className="absolute inset-0 will-change-transform"
        style={{
          backgroundImage: "url('/images/facility-exterior-mountains.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: `center calc(50% + ${parY}px)`,
          transition: 'background-position 0.1s linear',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(105deg, rgba(10,5,3,0.9) 0%, rgba(12,6,4,0.65) 45%, rgba(12,6,4,0.2) 75%, rgba(12,6,4,0.05) 100%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-2xl p-8 lg:p-10 rounded-2xl"
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(18px) saturate(140%)',
            WebkitBackdropFilter: 'blur(18px) saturate(140%)',
            border: '1px solid rgba(255,255,255,0.12)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.1s',
          }}
        >
          <p
            className="text-[11px] font-semibold tracking-[0.22em] uppercase text-accent mb-5"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Welcome to the Ranch
          </p>
          <h2
            id="intro-heading"
            className="font-bold tracking-tight mb-6"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.2rem, 4vw, 3.2rem)', lineHeight: 1.03 }}
          >
            A place you can <em className="not-italic" style={{ color: 'var(--color-accent)' }}>breathe again</em>.
          </h2>
          <p
            className="text-white/90 leading-relaxed text-lg mb-5"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            The ranch sits on 160 private acres at the base of the Swisshelm
            Mountains in Cochise County, Arizona. Wide desert, dramatic rock
            formations, and skies unbroken by city light — the land itself is
            part of the treatment.
          </p>
          <p
            className="text-white/75 leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Every corner was chosen for a reason. Quiet rooms to think, a
            working ranch that lets equine therapy happen every day, direct
            mountain views from nearly every window, and covered porches
            where the hardest conversations finally happen.
          </p>
        </div>
      </div>
    </section>
  );
}
