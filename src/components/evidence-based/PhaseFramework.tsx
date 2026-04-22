'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Evidence-Based — Phase 5. The four-phase healing framework.
 *
 * Desktop:
 *   - A horizontal rail painted in on scroll-in, with four numbered
 *     milestone markers anchored along it. Each marker sits above a
 *     stacked card that carries the phase number, title, tagline,
 *     and body copy. Progress rail is a gradient (primary-dark →
 *     accent → primary-dark) to imply forward motion.
 *
 * Mobile:
 *   - Same four cards in a vertical stack with a thin connector on
 *     the left, matching the design language of the residential
 *     timeline.
 */

const phases = [
  {
    number: '01',
    title: 'Positive expectancy & rapport',
    tagline: 'Healing begins with hope.',
    body:
      'We intentionally cultivate a sense of possibility — that change is not only achievable but sustainable. Through authentic connection, humility, and consistency, our clinicians establish strong therapeutic alliances that create the foundation for all meaningful work.',
    Icon: SparkIcon,
  },
  {
    number: '02',
    title: 'Psychoeducation & cognitive restructuring',
    tagline: 'Understanding reduces fear. Clarity creates choice.',
    body:
      'Clients develop a coherent understanding of their nervous system, trauma responses, and behavioral patterns. We identify and reshape unhelpful thought patterns and increase awareness of internal experience — transforming confusion into comprehensibility, overwhelm into manageability.',
    Icon: BookIcon,
  },
  {
    number: '03',
    title: 'Desensitization & integration',
    tagline: 'Processing happens when the nervous system is ready.',
    body:
      'Once internal resources and regulation capacity are established, clients may choose to engage in trauma memory processing. Our approach emphasizes titration, safety, and client-led pacing. We prioritize forward-facing approaches so integration doesn’t re-traumatize.',
    Icon: WaveIcon,
  },
  {
    number: '04',
    title: 'Post-traumatic growth & meaning-making',
    tagline: 'Transformation, not just symptom reduction.',
    body:
      'Clients reconnect with purpose, values, and identity beyond trauma. This phase focuses on building a life rooted in meaning, connection, and forward movement — not a life defined by what happened, but shaped by what the client chooses now.',
    Icon: CompassIcon,
  },
];

export default function PhaseFramework() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
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
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      id="phases"
      className="relative py-24 lg:py-32 bg-white overflow-hidden"
      aria-labelledby="phase-framework-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-20"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">Phase-Based Healing Framework</p>
          <h2
            id="phase-framework-heading"
            className="text-foreground font-bold tracking-tight mb-6"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3.1rem)', lineHeight: 1.03 }}
          >
            A structured, trauma-informed progression — <em className="not-italic text-primary">capacity before processing</em>.
          </h2>
          <p className="text-foreground/70 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            Every phase builds the resources needed for the next. Nobody here
            is asked to process a memory their nervous system is not yet
            equipped to hold.
          </p>
        </div>

        {/* Desktop progress rail + stacked cards */}
        <div className="relative hidden lg:block">
          {/* Progress rail */}
          <div className="absolute left-0 right-0 top-[52px] h-px bg-black/10" aria-hidden="true" />
          <div
            className="absolute left-0 top-[52px] h-px"
            aria-hidden="true"
            style={{
              background:
                'linear-gradient(90deg, var(--color-primary-dark) 0%, var(--color-accent) 50%, var(--color-primary-dark) 100%)',
              width: visible ? '100%' : '0%',
              transition: 'width 2.4s cubic-bezier(0.22,1,0.36,1) 0.3s',
            }}
          />

          <div className="grid grid-cols-4 gap-5">
            {phases.map((p, i) => {
              const Icon = p.Icon;
              return (
                <div
                  key={p.number}
                  className="relative pt-28"
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(22px)',
                    transition: `all 0.95s cubic-bezier(0.16,1,0.3,1) ${0.4 + i * 0.14}s`,
                  }}
                >
                  {/* Milestone marker */}
                  <div
                    className="absolute left-0 top-[28px] w-12 h-12 rounded-full flex items-center justify-center shadow-md"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      boxShadow: '0 0 0 5px rgba(188,107,74,0.15)',
                    }}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>

                  <p
                    className="text-[11px] font-semibold tracking-[0.22em] uppercase text-primary mb-2"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Phase {p.number}
                  </p>
                  <h3
                    className="text-foreground font-bold mb-3"
                    style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', lineHeight: 1.15 }}
                  >
                    {p.title}
                  </h3>
                  <p
                    className="text-accent italic mb-4"
                    style={{ fontFamily: 'var(--font-display)', fontSize: '0.98rem', lineHeight: 1.35 }}
                  >
                    {p.tagline}
                  </p>
                  <p
                    className="text-foreground/70 text-[14.5px] leading-relaxed"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {p.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile vertical timeline */}
        <div className="lg:hidden relative pl-7">
          {/* Vertical rail */}
          <div className="absolute left-[11px] top-4 bottom-4 w-px bg-black/10" aria-hidden="true" />
          <div
            className="absolute left-[11px] top-4 w-px"
            aria-hidden="true"
            style={{
              background: 'linear-gradient(180deg, var(--color-primary-dark) 0%, var(--color-accent) 60%, var(--color-primary-dark) 100%)',
              height: visible ? 'calc(100% - 2rem)' : '0%',
              transition: 'height 2.4s cubic-bezier(0.22,1,0.36,1) 0.2s',
            }}
          />
          <div className="space-y-10">
            {phases.map((p, i) => {
              const Icon = p.Icon;
              return (
                <article
                  key={p.number}
                  className="relative"
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateX(0)' : 'translateX(-8px)',
                    transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.14}s`,
                  }}
                >
                  <span
                    className="absolute -left-[30px] top-1.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                    style={{ boxShadow: '0 0 0 4px rgba(188,107,74,0.15)' }}
                    aria-hidden="true"
                  >
                    <Icon className="w-3 h-3 text-white" />
                  </span>
                  <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-primary mb-1" style={{ fontFamily: 'var(--font-body)' }}>
                    Phase {p.number}
                  </p>
                  <h3 className="text-foreground font-bold mb-2" style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>
                    {p.title}
                  </h3>
                  <p className="text-accent italic mb-3" style={{ fontFamily: 'var(--font-display)' }}>{p.tagline}</p>
                  <p className="text-foreground/70 text-[14.5px] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                    {p.body}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Small custom glyphs ──────────────────────────────────────────── */

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6a2 2 0 012-2h13v16H6a2 2 0 01-2-2V6z" />
      <path d="M8 8h8M8 12h6" />
    </svg>
  );
}
function WaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12c2.5-4 4-4 6 0s3.5 4 6 0 3-4 6 0" />
      <path d="M3 17c2.5-4 4-4 6 0s3.5 4 6 0 3-4 6 0" opacity="0.5" />
    </svg>
  );
}
function CompassIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polygon points="16,8 12,14 8,16 12,10" fill="currentColor" stroke="none" />
    </svg>
  );
}
