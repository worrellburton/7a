'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Philosophy — Phase 3. The TraumAddiction® reframe.
 *
 * Dark-section editorial beat. Left has the thesis prose; right has
 * an animated SVG of two converging circles (trauma + addiction)
 * labeled as separate → joined, driving the visual metaphor of our
 * integrated treatment of both as one condition.
 */
export default function TraumAddictionReframe() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.18 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="relative bg-dark-section text-white overflow-hidden" aria-labelledby="ta-heading">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 55% 55% at 15% 30%, rgba(107,42,20,0.35) 0%, rgba(107,42,20,0) 60%), radial-gradient(ellipse 50% 55% at 85% 80%, rgba(216,137,102,0.22) 0%, rgba(216,137,102,0) 60%)' }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-6" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)', transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.1s' }}>
            <p className="text-[11px] font-semibold tracking-[0.24em] uppercase text-accent mb-5" style={{ fontFamily: 'var(--font-body)' }}>
              The TraumAddiction<span className="align-super text-[9px]">®</span> Model
            </p>
            <h2 id="ta-heading" className="font-bold tracking-tight mb-7" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.1rem, 4.2vw, 3.2rem)', lineHeight: 1.03 }}>
              Addiction as a <em className="not-italic" style={{ color: 'var(--color-accent)' }}>post-traumatic adaptation</em> &mdash; not a moral failure.
            </h2>
            <div className="space-y-4 text-white/85 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
              <p>
                Substance use disorders and trauma-related conditions frequently
                co-occur, yet have historically been treated through parallel
                and often incompatible models. Our TraumAddiction<span className="align-super text-[10px]">®</span> model
                bridges this gap.
              </p>
              <p className="text-white/70">
                We understand substance use as a{' '}
                <strong className="text-white">functional adaptation</strong>&mdash;
                a way the nervous system regulates overwhelming emotional and
                physiological states. That reframe removes shame and opens the
                door to genuine healing.
              </p>
            </div>
          </div>

          <div className="lg:col-span-6" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(22px)', transition: 'all 1.05s cubic-bezier(0.16,1,0.3,1) 0.25s' }}>
            <TwoCirclesGlyph active={visible} />
          </div>
        </div>
      </div>
    </section>
  );
}

function TwoCirclesGlyph({ active }: { active: boolean }) {
  return (
    <div className="w-full aspect-square max-w-[460px] mx-auto relative">
      <svg viewBox="0 0 400 400" className="w-full h-full" role="img" aria-label="Trauma and addiction circles merge to form an integrated condition.">
        <defs>
          <radialGradient id="tacircA" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="tacircB" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Trauma circle */}
        <g style={{ transform: active ? 'translate(-30px, 0)' : 'translate(-130px, 0)', transition: 'transform 2s cubic-bezier(0.22,1,0.36,1) 0.2s' }}>
          <circle cx="200" cy="200" r="130" fill="url(#tacircA)" stroke="var(--color-primary)" strokeOpacity="0.75" strokeWidth="1.5" />
          <text x="200" y="100" textAnchor="middle" fill="var(--color-primary)" fontFamily="var(--font-body)" fontSize="11" fontWeight="700" letterSpacing="3.5" style={{ textTransform: 'uppercase' }}>Trauma</text>
        </g>

        {/* Addiction circle */}
        <g style={{ transform: active ? 'translate(30px, 0)' : 'translate(130px, 0)', transition: 'transform 2s cubic-bezier(0.22,1,0.36,1) 0.35s' }}>
          <circle cx="200" cy="200" r="130" fill="url(#tacircB)" stroke="var(--color-accent)" strokeOpacity="0.85" strokeWidth="1.5" />
          <text x="200" y="320" textAnchor="middle" fill="var(--color-accent)" fontFamily="var(--font-body)" fontSize="11" fontWeight="700" letterSpacing="3.5" style={{ textTransform: 'uppercase' }}>Addiction</text>
        </g>

        {/* Intersection label */}
        <g style={{ opacity: active ? 1 : 0, transition: 'opacity 0.9s ease 1.6s' }}>
          <circle cx="200" cy="200" r="8" fill="white" />
          <text x="200" y="236" textAnchor="middle" fill="white" fontFamily="var(--font-display)" fontSize="19" fontStyle="italic">one condition</text>
          <text x="200" y="258" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontFamily="var(--font-body)" fontSize="10" letterSpacing="3" style={{ textTransform: 'uppercase' }}>TraumAddiction</text>
        </g>
      </svg>
    </div>
  );
}
