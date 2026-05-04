'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';

/**
 * Philosophy — Phase 6. Forward-Facing® Accelerated Recovery editorial.
 * A long-form explanation of the model paired with a layered visual on
 * the right (concentric arcs that read as nervous-system regulation,
 * relationship, and growth). Dark section for weight.
 */

type Pillar = {
  tag: string;
  title: string;
  body: string;
  Icon: (p: { className?: string }) => ReactElement;
};

const pillars: Pillar[] = [
  {
    tag: 'Reframe',
    title: 'Addiction as adaptation, not pathology',
    body: 'A meaningful shift in how trauma and addiction are understood and treated. Rather than addressing these challenges separately, this model recognizes that trauma and addictive behaviors are deeply interconnected. Addiction is reframed not as a failure or pathology, but as an adaptive response — an attempt by the nervous system to cope with overwhelming internal experiences. By honoring this perspective, treatment becomes less about fixing what is "wrong" and more about building the capacity for lasting health and healing.',
    Icon: ReframeIcon,
  },
  {
    tag: 'Sequence',
    title: 'Capacity before processing',
    body: 'Instead of pushing intensive trauma memory processing too early, treatment begins with building safety, awareness, and self-regulation. As individuals gain the ability to feel safe in their bodies and manage stress effectively, they are better equipped to engage in deeper healing work without becoming overwhelmed.',
    Icon: SequenceIcon,
  },
  {
    tag: 'Skills',
    title: 'Nervous-system regulation in real time',
    body: 'A central component of this model is nervous system regulation. Trauma and addiction are both driven by patterns of physiological dysregulation that impact decision-making, emotional stability, and behavior. By teaching practical, experiential skills — such as breathwork, body awareness, and grounding techniques — individuals learn to interrupt stress responses in real time. This reduces cravings, enhances clarity, and restores a sense of choice and control. Over time, these skills are applied in real-world situations, allowing individuals to navigate triggers and challenges with increasing confidence and resilience.',
    Icon: SkillsIcon,
  },
  {
    tag: 'Relationship',
    title: 'Healing inside safe, attuned connection',
    body: 'Equally important is the role of relationship and environment in healing. This model emphasizes that transformation happens within safe, attuned, and regulated relationships — not just in therapy sessions, but across the entire treatment experience. By fostering connection, reducing shame, and building self-compassion, individuals are supported in moving beyond survival-based patterns toward intentional, values-driven living. The ultimate goal is not simply symptom reduction, but the creation of a meaningful, resilient life rooted in purpose, connection, and long-term recovery.',
    Icon: RelationshipIcon,
  },
];

export default function ForwardFacingAcceleratedRecovery() {
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
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative py-24 lg:py-32 bg-dark-section text-white overflow-hidden"
      aria-labelledby="fff-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 55% at 80% 10%, rgba(216,137,102,0.18) 0%, rgba(216,137,102,0) 65%), radial-gradient(ellipse 45% 50% at 10% 90%, rgba(107,42,20,0.28) 0%, rgba(107,42,20,0) 65%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          <div
            className="lg:col-span-7"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(14px)',
              transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.05s',
            }}
          >
            <p
              className="text-[11px] font-semibold tracking-[0.28em] uppercase text-accent mb-5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Forward-Facing<span className="align-super text-[9px]">®</span> Accelerated Recovery (FF-AR)
            </p>
            <h2
              id="fff-heading"
              className="font-bold tracking-tight mb-6"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.1rem, 4.2vw, 3.2rem)',
                lineHeight: 1.03,
              }}
            >
              Trauma and addiction, <em className="not-italic" style={{ color: 'var(--color-accent)' }}>treated together</em>.
            </h2>
            <p
              className="text-white/85 text-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The Forward-Facing<span className="align-super text-[9px]">®</span> Accelerated Recovery (FF-AR) model — developed by
              Dr. J. Eric Gentry and Lindsay Rothschild, LCSW — offers an
              integrative, salutogenic approach to treating trauma and addiction
              simultaneously.
            </p>
          </div>

          <div
            className="lg:col-span-5 flex justify-center lg:justify-end"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 1.1s cubic-bezier(0.16,1,0.3,1) 0.2s',
            }}
          >
            <FFGlyph active={visible} />
          </div>
        </div>

        <div className="mt-16 lg:mt-24 grid sm:grid-cols-2 gap-5 lg:gap-6">
          {pillars.map((p, i) => {
            const Icon = p.Icon;
            return (
              <article
                key={p.title}
                className="rounded-2xl p-7 lg:p-8 bg-white/[0.04] border border-white/10 hover:border-white/25 hover:bg-white/[0.07] transition-all duration-300"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 0.95s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.1}s`,
                }}
              >
                <div className="flex items-start gap-5">
                  <div
                    className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(216,137,102,0.22) 0%, rgba(216,137,102,0.06) 100%)',
                      color: 'var(--color-accent)',
                    }}
                    aria-hidden="true"
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-[10px] font-semibold tracking-[0.24em] uppercase text-accent/85 mb-2"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {p.tag}
                    </p>
                    <h3
                      className="font-bold mb-3"
                      style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', lineHeight: 1.15 }}
                    >
                      {p.title}
                    </h3>
                    <p
                      className="text-white/75 leading-relaxed text-[15px]"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {p.body}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Visual ──────────────────────────────────────────────────────── */

function FFGlyph({ active }: { active: boolean }) {
  return (
    <div className="w-full max-w-[420px] aspect-square">
      <svg
        viewBox="0 0 400 400"
        className="w-full h-full"
        role="img"
        aria-label="Concentric rings representing the body, relationship, and growth in the Forward-Facing Accelerated Recovery model."
      >
        <defs>
          <radialGradient id="ffrCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="200" cy="200" r="170" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <circle cx="200" cy="200" r="130" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <circle cx="200" cy="200" r="90" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

        <circle
          cx="200"
          cy="200"
          r="170"
          fill="none"
          stroke="var(--color-primary)"
          strokeOpacity="0.55"
          strokeWidth="1.5"
          strokeDasharray="1068"
          strokeDashoffset={active ? 0 : 1068}
          style={{ transition: 'stroke-dashoffset 2.4s cubic-bezier(0.22,1,0.36,1) 0.2s' }}
        />
        <circle
          cx="200"
          cy="200"
          r="130"
          fill="none"
          stroke="var(--color-accent)"
          strokeOpacity="0.7"
          strokeWidth="1.5"
          strokeDasharray="817"
          strokeDashoffset={active ? 0 : 817}
          style={{ transition: 'stroke-dashoffset 2.4s cubic-bezier(0.22,1,0.36,1) 0.45s' }}
        />
        <circle
          cx="200"
          cy="200"
          r="90"
          fill="none"
          stroke="var(--color-primary)"
          strokeOpacity="0.85"
          strokeWidth="1.5"
          strokeDasharray="566"
          strokeDashoffset={active ? 0 : 566}
          style={{ transition: 'stroke-dashoffset 2.4s cubic-bezier(0.22,1,0.36,1) 0.7s' }}
        />

        <circle cx="200" cy="200" r="55" fill="url(#ffrCore)" />
        <circle cx="200" cy="200" r="6" fill="var(--color-accent)" />

        <text
          x="200"
          y="58"
          textAnchor="middle"
          fill="rgba(255,255,255,0.65)"
          fontFamily="var(--font-body)"
          fontSize="11"
          letterSpacing="3"
          style={{ textTransform: 'uppercase' }}
        >
          Growth
        </text>
        <text
          x="200"
          y="98"
          textAnchor="middle"
          fill="rgba(255,255,255,0.55)"
          fontFamily="var(--font-body)"
          fontSize="10"
          letterSpacing="3"
          style={{ textTransform: 'uppercase' }}
        >
          Relationship
        </text>
        <text
          x="200"
          y="138"
          textAnchor="middle"
          fill="rgba(255,255,255,0.45)"
          fontFamily="var(--font-body)"
          fontSize="10"
          letterSpacing="3"
          style={{ textTransform: 'uppercase' }}
        >
          Body
        </text>
        <text
          x="200"
          y="208"
          textAnchor="middle"
          fill="var(--color-accent)"
          fontFamily="var(--font-display)"
          fontSize="13"
          fontStyle="italic"
        >
          regulation
        </text>
      </svg>
    </div>
  );
}

/* ── Pillar glyphs ───────────────────────────────────────────────── */

function ReframeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 11h18l-3-3M27 21H9l3 3" />
    </svg>
  );
}
function SequenceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 22h22" />
      <circle cx="9" cy="22" r="3" />
      <circle cx="17" cy="22" r="3" />
      <circle cx="25" cy="22" r="3" />
      <path d="M9 19v-5M17 19v-9M25 19v-13" />
    </svg>
  );
}
function SkillsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16c4-5 8-5 12 0s8 5 12 0" />
      <path d="M4 22c4-5 8-5 12 0s8 5 12 0" opacity="0.55" />
    </svg>
  );
}
function RelationshipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="13" r="3" />
      <circle cx="21" cy="13" r="3" />
      <path d="M5 25c1-4 4-6 6-6s5 2 6 6" />
      <path d="M15 25c1-4 4-6 6-6s5 2 6 6" />
    </svg>
  );
}
