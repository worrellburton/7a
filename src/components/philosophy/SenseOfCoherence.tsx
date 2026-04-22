'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Philosophy — Phase 5. Sense of Coherence — the three domains.
 * Custom triangular Venn-like SVG in the center showing
 * Comprehensibility / Manageability / Meaningfulness overlapping at a
 * central "coherence" node. Three editorial cards underneath describe
 * each domain in detail.
 */

const domains = [
  {
    title: 'Comprehensibility',
    subtitle: 'Understanding your nervous system',
    body: 'Through psychoeducation and guided awareness, clients develop a coherent understanding of their autonomic nervous system. Urges and cravings are reframed as predictable responses to dysregulation — not failures of willpower.',
    color: 'var(--color-primary)',
  },
  {
    title: 'Manageability',
    subtitle: 'Building self-regulation',
    body: 'Through neuroception, interoception, and acute relaxation strategies, clients interrupt adaptive threat responses and return to states of physiological safety — restoring cognitive flexibility, emotional regulation, and behavioral effectiveness.',
    color: 'var(--color-accent)',
  },
  {
    title: 'Meaningfulness',
    subtitle: 'Living with purpose',
    body: 'Through personal mission work, a code of honor, and values-driven practice, clients engage life\'s challenges as purposeful and worthy of sustained investment. The most generative force in lasting recovery.',
    color: 'var(--color-primary-dark)',
  },
];

export default function SenseOfCoherence() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="relative py-24 lg:py-32 bg-white overflow-hidden" aria-labelledby="soc-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12 lg:mb-16" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(14px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s' }}>
          <p className="section-label justify-center mb-5">Sense of Coherence</p>
          <h2 id="soc-heading" className="text-foreground font-bold tracking-tight mb-5" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3.1rem)', lineHeight: 1.03 }}>
            Three domains. <em className="not-italic text-primary">One felt sense.</em>
          </h2>
          <p className="text-foreground/70 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            Antonovsky&rsquo;s Sense of Coherence — the feeling that life is
            comprehensible, manageable, and meaningful — sits at the center
            of every phase of treatment.
          </p>
        </div>

        {/* Venn glyph */}
        <div className="max-w-lg mx-auto mb-14" style={{ opacity: visible ? 1 : 0, transform: visible ? 'scale(1)' : 'scale(0.92)', transition: 'all 1.2s cubic-bezier(0.22,1,0.36,1) 0.2s' }}>
          <TripleVenn active={visible} />
        </div>

        <div className="grid md:grid-cols-3 gap-5 lg:gap-6">
          {domains.map((d, i) => (
            <article key={d.title} className="rounded-2xl bg-warm-bg p-7 lg:p-8 border border-black/5" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(18px)', transition: `all 0.95s cubic-bezier(0.16,1,0.3,1) ${0.5 + i * 0.12}s` }}>
              <span className="inline-block w-3 h-3 rounded-full mb-4" style={{ backgroundColor: d.color }} aria-hidden="true" />
              <h3 className="text-foreground font-bold mb-2" style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', lineHeight: 1.15 }}>{d.title}</h3>
              <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-4" style={{ fontFamily: 'var(--font-body)', color: d.color }}>{d.subtitle}</p>
              <p className="text-foreground/70 text-[14.5px] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{d.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function TripleVenn({ active }: { active: boolean }) {
  // Three circles arranged in a triangle, overlapping at center.
  const cx = 200;
  const cy = 200;
  const r = 90;
  const d = 60; // offset distance from center
  const a = Math.PI * 2 / 3;
  const positions = [
    { x: cx + Math.cos(-Math.PI / 2) * d, y: cy + Math.sin(-Math.PI / 2) * d, color: 'var(--color-primary)', label: 'Comprehensibility', labelXY: { x: cx, y: 38 } },
    { x: cx + Math.cos(-Math.PI / 2 + a) * d, y: cy + Math.sin(-Math.PI / 2 + a) * d, color: 'var(--color-accent)', label: 'Manageability', labelXY: { x: 380, y: 310 } },
    { x: cx + Math.cos(-Math.PI / 2 + 2 * a) * d, y: cy + Math.sin(-Math.PI / 2 + 2 * a) * d, color: 'var(--color-primary-dark)', label: 'Meaningfulness', labelXY: { x: 20, y: 310 } },
  ];
  return (
    <svg viewBox="0 0 400 400" className="w-full aspect-square" role="img" aria-label="Triple Venn diagram of Comprehensibility, Manageability, and Meaningfulness meeting at Coherence.">
      {positions.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={r}
          fill={p.color}
          fillOpacity={active ? 0.22 : 0}
          stroke={p.color}
          strokeOpacity={active ? 0.75 : 0}
          strokeWidth="1.25"
          style={{ transition: `all 1.2s cubic-bezier(0.22,1,0.36,1) ${0.3 + i * 0.15}s` }}
        />
      ))}
      <circle cx={cx} cy={cy} r="8" fill="white" stroke="var(--color-accent)" strokeWidth="1.5" style={{ opacity: active ? 1 : 0, transition: 'opacity 0.8s ease 1.2s' }} />
      <text x={cx} y={cy + 30} textAnchor="middle" fill="#1a1a1a" fontFamily="var(--font-display)" fontSize="14" fontStyle="italic" style={{ opacity: active ? 1 : 0, transition: 'opacity 0.8s ease 1.4s' }}>coherence</text>
      {positions.map((p, i) => (
        <text key={`l-${i}`} x={p.labelXY.x} y={p.labelXY.y} textAnchor="middle" fill={p.color} fontFamily="var(--font-body)" fontSize="11" fontWeight="700" letterSpacing="3" style={{ opacity: active ? 1 : 0, transition: `opacity 0.8s ease ${0.9 + i * 0.1}s`, textTransform: 'uppercase' }}>
          {p.label}
        </text>
      ))}
    </svg>
  );
}
