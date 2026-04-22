'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Philosophy — Phase 9. Nervous-system grounding editorial beat.
 * Quiet dark-section with a slow-breathing SVG torus at the center
 * — breathe in, breathe out — and a serif pull-quote. Intentionally
 * spacious; this is the page's pause before the CTA.
 */
export default function NervousSystemGrounding() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="relative overflow-hidden bg-dark-section text-white" aria-labelledby="grounding-heading">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(216,137,102,0.18) 0%, rgba(216,137,102,0) 60%)' }} />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-28 lg:py-40 text-center">
        <div className="mb-10 flex justify-center" style={{ opacity: visible ? 1 : 0, transform: visible ? 'scale(1)' : 'scale(0.9)', transition: 'all 1.2s cubic-bezier(0.22,1,0.36,1) 0.1s' }}>
          <BreathTorus />
        </div>
        <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-accent mb-6" style={{ fontFamily: 'var(--font-body)', opacity: visible ? 1 : 0, transition: 'opacity 0.9s ease 0.25s' }}>Regulation Is The Foundation</p>
        <blockquote className="font-bold tracking-tight max-w-3xl mx-auto" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.9rem, 4vw, 3rem)', lineHeight: 1.08, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)', transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.4s' }}>
          <span className="text-accent mr-1" style={{ fontSize: '1.5em', lineHeight: 0 }}>&ldquo;</span>
          Freedom happens when the nervous system learns it is <em className="not-italic" style={{ color: 'var(--color-accent)' }}>safe to live</em>.
        </blockquote>
        <p id="grounding-heading" className="sr-only">Nervous System Grounding</p>
      </div>
    </section>
  );
}

function BreathTorus() {
  return (
    <svg viewBox="0 0 240 240" className="w-40 h-40 lg:w-48 lg:h-48" role="img" aria-label="Slow breathing torus.">
      <defs>
        <radialGradient id="brGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.38" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="110" fill="url(#brGlow)">
        <animate attributeName="r" values="90;110;90" dur="6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.55;1;0.55" dur="6s" repeatCount="indefinite" />
      </circle>
      <circle cx="120" cy="120" r="70" fill="none" stroke="var(--color-accent)" strokeOpacity="0.55" strokeWidth="1">
        <animate attributeName="r" values="60;76;60" dur="6s" repeatCount="indefinite" />
      </circle>
      <circle cx="120" cy="120" r="40" fill="var(--color-accent)" fillOpacity="0.6">
        <animate attributeName="r" values="32;44;32" dur="6s" repeatCount="indefinite" />
      </circle>
      <circle cx="120" cy="120" r="6" fill="white" />
    </svg>
  );
}
