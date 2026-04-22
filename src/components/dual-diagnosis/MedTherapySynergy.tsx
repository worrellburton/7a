'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Dual Diagnosis — Phase 7. Editorial section on the coordination
 * between medication management and clinical therapy. Dark section,
 * two-column composition: prose on the left, an animated "handshake"
 * SVG of interlocking capsule + thought-bubble forms on the right.
 */
export default function MedTherapySynergy() {
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
    <section ref={ref} className="relative bg-dark-section text-white overflow-hidden" aria-labelledby="mt-heading">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 55% 55% at 85% 40%, rgba(216,137,102,0.2) 0%, rgba(216,137,102,0) 65%)' }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-6" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)', transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.1s' }}>
            <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-accent mb-5" style={{ fontFamily: 'var(--font-body)' }}>Medication + Therapy</p>
            <h2 id="mt-heading" className="font-bold tracking-tight mb-7" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.1rem, 4.2vw, 3.2rem)', lineHeight: 1.03 }}>
              The psychiatrist and the therapist <em className="not-italic" style={{ color: 'var(--color-accent)' }}>share a chart</em>.
            </h2>
            <div className="space-y-4 text-white/85 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
              <p>
                When prescribing and clinical care live in different buildings,
                clients pay the cost. Dosage changes collide with somatic work.
                New meds arrive without context. Group therapy hits an
                unmedicated wall on a Thursday and no one calls the psychiatrist
                until Monday.
              </p>
              <p className="text-white/70">
                Here, the psychiatrist, the therapist, and the medical team
                round on every dual-diagnosis client together. A change in one
                layer immediately informs the others.
              </p>
            </div>
          </div>
          <div className="lg:col-span-6" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(22px)', transition: 'all 1.05s cubic-bezier(0.16,1,0.3,1) 0.25s' }}>
            <SynergyGlyph active={visible} />
          </div>
        </div>
      </div>
    </section>
  );
}

function SynergyGlyph({ active }: { active: boolean }) {
  return (
    <div className="w-full aspect-[5/4] max-w-[500px] mx-auto">
      <svg viewBox="0 0 500 400" className="w-full h-full" role="img" aria-label="Medication and therapy as interlocking disciplines.">
        <defs>
          <linearGradient id="synGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Capsule (medication) — left */}
        <g style={{ transform: active ? 'translate(0, 0)' : 'translate(-60px, 0)', transition: 'transform 1.8s cubic-bezier(0.22,1,0.36,1) 0.2s' }}>
          <rect x="80" y="160" width="180" height="80" rx="40" fill="var(--color-primary)" fillOpacity="0.18" stroke="var(--color-primary)" strokeOpacity="0.7" strokeWidth="1.5" />
          <line x1="170" y1="160" x2="170" y2="240" stroke="var(--color-primary)" strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="4 4" />
          <text x="130" y="206" textAnchor="middle" fill="var(--color-primary)" fontFamily="var(--font-body)" fontSize="11" fontWeight="700" letterSpacing="3" style={{ textTransform: 'uppercase' }}>MED</text>
          <text x="210" y="206" textAnchor="middle" fill="var(--color-accent)" fontFamily="var(--font-body)" fontSize="11" fontWeight="700" letterSpacing="3" style={{ textTransform: 'uppercase' }}>OUT</text>
        </g>

        {/* Thought cloud (therapy) — right */}
        <g style={{ transform: active ? 'translate(0, 0)' : 'translate(60px, 0)', transition: 'transform 1.8s cubic-bezier(0.22,1,0.36,1) 0.35s' }}>
          <path d="M 260 200 Q 260 140 320 140 Q 360 110 400 140 Q 450 150 440 200 Q 450 240 400 250 Q 360 270 320 250 Q 260 260 260 200 Z" fill="var(--color-accent)" fillOpacity="0.15" stroke="var(--color-accent)" strokeOpacity="0.85" strokeWidth="1.5" />
          <circle cx="260" cy="260" r="5" fill="var(--color-accent)" fillOpacity="0.6" />
          <circle cx="250" cy="275" r="3" fill="var(--color-accent)" fillOpacity="0.45" />
          <text x="360" y="206" textAnchor="middle" fill="var(--color-accent)" fontFamily="var(--font-body)" fontSize="11" fontWeight="700" letterSpacing="3" style={{ textTransform: 'uppercase' }}>THERAPY</text>
        </g>

        {/* Bridging line + pulse traveling between them */}
        <line x1="260" y1="200" x2="260" y2="200" stroke="url(#synGrad)" strokeWidth="2" style={{ opacity: active ? 1 : 0, transition: 'opacity 0.5s ease 1.6s' }} />
        {active && (
          <circle r="5" fill="var(--color-accent)">
            <animate attributeName="cx" values="180;340;180" dur="5s" repeatCount="indefinite" />
            <animate attributeName="cy" values="200;200;200" dur="5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="5s" repeatCount="indefinite" />
          </circle>
        )}

        <text x="250" y="320" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontFamily="var(--font-display)" fontSize="15" fontStyle="italic">shared chart · daily rounds</text>
      </svg>
    </div>
  );
}
