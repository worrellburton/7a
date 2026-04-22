'use client';

import { useEffect, useRef, useState } from 'react';
import { usePersona } from './PersonaContext';

/**
 * Phase 4 — the "why us" differentiator.
 *
 * A side-by-side animated SVG comparison: Seven Arrows vs. the
 * typical large-volume residential rehab. Three dimensions that
 * actually change the outcome (trauma integration, duration
 * flexibility, staff ratio) render as paired dots on a horizontal
 * scale; on scroll-in, the Seven Arrows dots glide to the right
 * position while the typical-rehab dots settle left.
 *
 * Copy adapts to persona: "for yourself" gets "your primary
 * clinician"; "for a loved one" gets "your loved one's primary
 * clinician." The clinical content is identical — the relational
 * frame changes.
 */

type Dim = {
  label: string;
  left: { label: string; pct: number; note: string };
  right: { label: string; pct: number; note: string };
  note: string;
};

function makeDims(persona: 'self' | 'loved_one' | null): Dim[] {
  const clinician =
    persona === 'loved_one' ? "your loved one's primary clinician" : 'your primary clinician';
  return [
    {
      label: 'Trauma treated alongside addiction',
      left: {
        label: 'Typical residential',
        pct: 28,
        note: 'Trauma work is usually deferred to outpatient, if it happens at all.',
      },
      right: {
        label: 'Seven Arrows',
        pct: 94,
        note: `TraumAddiction® approach — ${clinician} holds both the substance and the trauma arc from day one.`,
      },
      note: 'This is the single biggest difference in how we sequence care.',
    },
    {
      label: 'Client-to-staff ratio',
      left: {
        label: 'Typical residential',
        pct: 20,
        note: '15:1 or 20:1 is common at higher-volume programs. Care drifts toward the loudest case.',
      },
      right: {
        label: 'Seven Arrows',
        pct: 92,
        note: '6:1 by design. You are not a case load — you are a specific person in a small room.',
      },
      note: 'A 6:1 ratio is not a marketing number. It is the reason individual attention is possible.',
    },
    {
      label: 'Length-of-stay flexibility',
      left: {
        label: 'Typical residential',
        pct: 35,
        note: 'Insurance-driven 28 or 30 days. The arc ends when the billing cycle does.',
      },
      right: {
        label: 'Seven Arrows',
        pct: 90,
        note: '30 / 60 / 90+ day options based on clinical need. We will not discharge you before you are ready.',
      },
      note: 'Duration gets decided by the clinical team, not the pre-auth window.',
    },
  ];
}

export default function Differentiator() {
  const { persona } = usePersona();
  const dims = makeDims(persona);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es)
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
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
      className="py-24 lg:py-32 bg-white relative overflow-hidden"
      aria-labelledby="diff-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 55% at 85% 50%, rgba(216,137,102,0.07) 0%, rgba(216,137,102,0) 65%)',
        }}
      />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-16"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">Why us, specifically</p>
          <h2
            id="diff-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.05,
            }}
          >
            Three dimensions that <em className="not-italic text-primary">actually change the outcome</em>.
          </h2>
          <p
            className="text-foreground/65 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Almost every residential program in the country claims
            &ldquo;trauma-informed&rdquo; and &ldquo;individualized.&rdquo;
            Here&rsquo;s the specific operational difference.
          </p>
        </div>

        <ol className="space-y-10 lg:space-y-14">
          {dims.map((d, i) => (
            <li
              key={d.label}
              className="grid lg:grid-cols-12 gap-6 lg:gap-10 items-start"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(18px)',
                transition: `all 0.95s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.15}s`,
              }}
            >
              <div className="lg:col-span-4">
                <p
                  className="text-[11px] tracking-[0.22em] uppercase font-bold text-primary mb-2"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Dimension {String(i + 1).padStart(2, '0')}
                </p>
                <h3
                  className="text-foreground font-bold mb-3"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.35rem, 2vw, 1.7rem)',
                    lineHeight: 1.15,
                  }}
                >
                  {d.label}
                </h3>
                <p
                  className="text-foreground/65 text-[14.5px] leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {d.note}
                </p>
              </div>

              <div className="lg:col-span-8">
                <DimChart dim={d} visible={visible} index={i} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function DimChart({ dim, visible, index }: { dim: Dim; visible: boolean; index: number }) {
  const baseDelay = 0.4 + index * 0.2;
  return (
    <div className="rounded-2xl border border-black/5 bg-warm-bg p-6 lg:p-8">
      <div className="relative h-12 lg:h-14 rounded-full bg-black/5 overflow-hidden mb-4">
        <div aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px bg-black/10" />
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: visible ? `${dim.left.pct}%` : '0%',
            background: 'linear-gradient(90deg, #a4958a 0%, #8a7d72 100%)',
            transition: `width 1.4s cubic-bezier(0.22,1,0.36,1) ${baseDelay}s`,
          }}
        />
        <div
          className="absolute inset-y-0 right-0 rounded-full"
          style={{
            width: visible ? `${dim.right.pct}%` : '0%',
            background: 'linear-gradient(270deg, #d88966 0%, #b45a39 100%)',
            transition: `width 1.6s cubic-bezier(0.22,1,0.36,1) ${baseDelay + 0.2}s`,
          }}
        />

        <span
          className="absolute left-0 inset-y-0 flex items-center pl-4 text-[11px] tracking-[0.22em] uppercase font-bold text-white mix-blend-luminosity"
          style={{ fontFamily: 'var(--font-body)', opacity: visible ? 0.9 : 0, transition: `opacity 0.8s ease ${baseDelay + 0.6}s` }}
        >
          Typical
        </span>
        <span
          className="absolute right-0 inset-y-0 flex items-center pr-4 text-[11px] tracking-[0.22em] uppercase font-bold text-white"
          style={{ fontFamily: 'var(--font-body)', opacity: visible ? 1 : 0, transition: `opacity 0.8s ease ${baseDelay + 0.8}s` }}
        >
          Seven Arrows
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 text-[13.5px]" style={{ fontFamily: 'var(--font-body)' }}>
        <div>
          <p className="text-foreground/45 text-[11px] tracking-[0.22em] uppercase font-semibold mb-1">
            {dim.left.label}
          </p>
          <p className="text-foreground/65 leading-relaxed">{dim.left.note}</p>
        </div>
        <div>
          <p className="text-primary text-[11px] tracking-[0.22em] uppercase font-bold mb-1">
            {dim.right.label}
          </p>
          <p className="text-foreground/80 leading-relaxed">{dim.right.note}</p>
        </div>
      </div>
    </div>
  );
}
