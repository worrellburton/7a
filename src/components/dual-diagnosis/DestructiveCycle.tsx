'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Dual Diagnosis — Phase 2. Animated SVG of the feedback loop between
 * mental-health symptoms and substance use. Two labeled nodes with
 * curved arrows tracing the cycle; the arrows pulse along their path
 * once the section scrolls into view.
 */
export default function DestructiveCycle() {
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
    <section ref={ref} className="relative py-24 lg:py-32 bg-warm-bg overflow-hidden" aria-labelledby="cycle-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-6" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)', transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.1s' }}>
            <p className="section-label mb-5">The Cycle</p>
            <h2 id="cycle-heading" className="text-foreground font-bold tracking-tight mb-7" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3.1rem)', lineHeight: 1.03 }}>
              Untreated, the two <em className="not-italic text-primary">fuel each other</em>.
            </h2>
            <div className="space-y-4 text-foreground/75 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
              <p>
                Mental-health symptoms drive self-medication. Substance use
                worsens the underlying dysregulation. Each round of the loop
                tightens the next.
              </p>
              <p className="text-foreground/60">
                When only one side is treated, the other keeps pulling recovery
                apart. Integration isn&rsquo;t an upgrade &mdash; it&rsquo;s the
                minimum viable approach for lasting change.
              </p>
            </div>
          </div>
          <div className="lg:col-span-6" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(22px)', transition: 'all 1.05s cubic-bezier(0.16,1,0.3,1) 0.25s' }}>
            <CycleGlyph active={visible} />
          </div>
        </div>
      </div>
    </section>
  );
}

function CycleGlyph({ active }: { active: boolean }) {
  return (
    <div className="w-full aspect-square max-w-[460px] mx-auto">
      <svg viewBox="0 0 400 400" className="w-full h-full" role="img" aria-label="Feedback loop between mental health symptoms and substance use, each amplifying the other.">
        <defs>
          <linearGradient id="cycleGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Two nodes */}
        <g>
          <circle cx="110" cy="200" r="58" fill="var(--color-primary)" fillOpacity="0.1" stroke="var(--color-primary)" strokeOpacity="0.7" strokeWidth="1.5" />
          <text x="110" y="198" textAnchor="middle" fill="var(--color-primary)" fontFamily="var(--font-body)" fontSize="11" fontWeight="700" letterSpacing="3">MENTAL</text>
          <text x="110" y="213" textAnchor="middle" fill="var(--color-primary)" fontFamily="var(--font-body)" fontSize="11" fontWeight="700" letterSpacing="3">HEALTH</text>

          <circle cx="290" cy="200" r="58" fill="var(--color-accent)" fillOpacity="0.1" stroke="var(--color-accent)" strokeOpacity="0.85" strokeWidth="1.5" />
          <text x="290" y="198" textAnchor="middle" fill="var(--color-accent)" fontFamily="var(--font-body)" fontSize="11" fontWeight="700" letterSpacing="3">SUBSTANCE</text>
          <text x="290" y="213" textAnchor="middle" fill="var(--color-accent)" fontFamily="var(--font-body)" fontSize="11" fontWeight="700" letterSpacing="3">USE</text>
        </g>

        {/* Upper arc arrow — MH → SU */}
        <g style={{ opacity: active ? 1 : 0, transition: 'opacity 0.8s ease 0.4s' }}>
          <path id="dcArcTop" d="M 155 160 Q 200 80 245 160" fill="none" stroke="url(#cycleGrad)" strokeWidth="1.75" strokeLinecap="round" strokeDasharray="280" strokeDashoffset={active ? 0 : 280} style={{ transition: 'stroke-dashoffset 1.8s cubic-bezier(0.22,1,0.36,1) 0.5s' }} />
          <polygon points="245,160 238,152 236,164" fill="var(--color-accent)" />
          <text x="200" y="100" textAnchor="middle" fill="rgba(0,0,0,0.55)" fontFamily="var(--font-display)" fontSize="14" fontStyle="italic">self-medication</text>
        </g>

        {/* Lower arc arrow — SU → MH */}
        <g style={{ opacity: active ? 1 : 0, transition: 'opacity 0.8s ease 0.8s' }}>
          <path id="dcArcBot" d="M 245 240 Q 200 320 155 240" fill="none" stroke="url(#cycleGrad)" strokeWidth="1.75" strokeLinecap="round" strokeDasharray="280" strokeDashoffset={active ? 0 : 280} style={{ transition: 'stroke-dashoffset 1.8s cubic-bezier(0.22,1,0.36,1) 0.9s' }} />
          <polygon points="155,240 162,232 164,244" fill="var(--color-primary)" transform="rotate(180 155 240)" />
          <text x="200" y="312" textAnchor="middle" fill="rgba(0,0,0,0.55)" fontFamily="var(--font-display)" fontSize="14" fontStyle="italic">worsens dysregulation</text>
        </g>

        {/* Pulse indicators that travel the loop */}
        {active && (
          <>
            <circle r="4" fill="var(--color-accent)">
              <animateMotion dur="6s" repeatCount="indefinite">
                <mpath href="#dcArcTop" />
              </animateMotion>
            </circle>
            <circle r="4" fill="var(--color-primary)">
              <animateMotion dur="6s" begin="3s" repeatCount="indefinite">
                <mpath href="#dcArcBot" />
              </animateMotion>
            </circle>
          </>
        )}
      </svg>
    </div>
  );
}
