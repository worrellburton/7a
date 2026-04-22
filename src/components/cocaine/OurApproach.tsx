'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';

/**
 * Cocaine — Phase 7. "Our approach."
 *
 * Six-tile bento laying out the clinical arc of cocaine treatment at
 * Seven Arrows. One flagship tile spans the top row (SCBT); the other
 * five sit in a 2×3 grid beneath. Custom hand-drawn glyphs.
 */

type Modality = {
  title: string;
  body: string;
  Icon: (p: { className?: string }) => ReactElement;
};

const flagship: Modality = {
  title: 'Somatic-Cognitive Behavioral Therapy for stimulant craving',
  body: 'Our house-integrated CBT variant layers cognitive restructuring over somatic awareness. Clients track the body while they track the thought — so the craving loop is interrupted at the nervous-system level, not just the decision level.',
  Icon: BrainBodyIcon,
};

const modalities: Modality[] = [
  {
    title: 'Cardiac & psychiatric stabilization',
    body: 'On-arrival cardiovascular assessment, baseline labs, 24/7 medical oversight through the crash window. MAT when clinically indicated for co-occurring conditions.',
    Icon: HeartIcon,
  },
  {
    title: 'Contingency-management reward scaffolding',
    body: 'Evidence-based positive-reinforcement protocols that rebuild the reward circuit during the anhedonia window. Small wins, tracked, reinforced.',
    Icon: TrophyIcon,
  },
  {
    title: 'Trauma-informed therapy',
    body: 'Forward-Facing Freedom®, EMDR, ART, and IFS — sequenced so trauma work opens up only after nervous-system regulation has been rebuilt.',
    Icon: SpiralIcon,
  },
  {
    title: 'Equine-assisted work',
    body: 'Horses mirror nervous-system states without judgment. Clients who have been stuck in a stimulant-driven overdrive learn what down-regulation physically feels like.',
    Icon: HorseIcon,
  },
  {
    title: 'Breathwork, yoga, sound',
    body: 'Cardiac-coherent breath practices, invitational yoga, and sound-bath sessions that move the parasympathetic system back online — where the drug kept it silenced.',
    Icon: BreathIcon,
  },
  {
    title: 'Dual-diagnosis care',
    body: 'Integrated treatment for ADHD, depression, anxiety, PTSD, and the conditions most often found riding alongside stimulant use. One team, one plan.',
    Icon: DuoIcon,
  },
];

export default function OurApproach() {
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
      { threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style = (d: number) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(18px)',
    transition: `all 0.85s cubic-bezier(0.16,1,0.3,1) ${d}s`,
  });

  const FlagshipIcon = flagship.Icon;

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32 bg-warm-bg overflow-hidden"
      aria-labelledby="approach-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14 lg:mb-20" style={style(0.05)}>
          <p className="section-label mb-5">Our Approach</p>
          <h2
            id="approach-heading"
            className="text-foreground font-bold tracking-tight mb-6"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 3.9vw, 3rem)',
              lineHeight: 1.03,
            }}
          >
            Stabilize the nervous system.{' '}
            <em className="not-italic text-primary">Rebuild the reward.</em>{' '}
            Restore the life.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            The sequence matters. Too much trauma processing in week
            one re-triggers craving. Too little structure in week two
            loses the client back into the cycle. We sequence the work
            carefully.
          </p>
        </div>

        {/* Flagship */}
        <article
          className="relative rounded-3xl overflow-hidden mb-5 lg:mb-6 p-8 lg:p-12 text-white"
          style={{
            ...style(0.12),
            background: 'linear-gradient(115deg, var(--color-dark-section) 0%, var(--color-primary-dark) 90%)',
          }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 45% 55% at 85% 20%, rgba(216,137,102,0.3) 0%, rgba(216,137,102,0) 65%)',
            }}
          />
          <div className="relative flex flex-col lg:flex-row gap-8 lg:gap-10 items-start lg:items-center">
            <div
              className="shrink-0 w-20 h-20 lg:w-24 lg:h-24 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <FlagshipIcon className="w-10 h-10 lg:w-12 lg:h-12 text-accent" />
            </div>
            <div className="flex-1 max-w-3xl">
              <p
                className="text-[11px] font-semibold tracking-[0.22em] uppercase text-accent mb-3"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Flagship modality
              </p>
              <h3
                className="font-bold tracking-tight mb-3"
                style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', lineHeight: 1.1 }}
              >
                {flagship.title}
              </h3>
              <p className="text-white/85 leading-relaxed text-[15.5px]" style={{ fontFamily: 'var(--font-body)' }}>
                {flagship.body}
              </p>
            </div>
          </div>
        </article>

        {/* Grid of six */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {modalities.map((m, i) => {
            const Icon = m.Icon;
            return (
              <article
                key={m.title}
                className="rounded-2xl bg-white p-6 border border-black/5 hover:border-primary/25 hover:shadow-md transition-all"
                style={style(0.2 + i * 0.06)}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'rgba(188,107,74,0.1)' }}
                >
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3
                  className="text-foreground font-bold mb-2"
                  style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', lineHeight: 1.15 }}
                >
                  {m.title}
                </h3>
                <p className="text-foreground/70 text-[14.5px] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                  {m.body}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── glyphs ─────────────────────────────────────────────────────── */
function BrainBodyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="14" r="6" />
      <path d="M24 20v8M18 28h12l2 6-4 6h-8l-4-6zM24 28v14" />
      <circle cx="24" cy="14" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}
function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 8c0 6-8 11-8 11S4 14 4 8a4 4 0 018-1 4 4 0 018 1z" />
      <path d="M8 11h3l1-2 2 4 1-2h1" />
    </svg>
  );
}
function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h12v5a6 6 0 01-12 0V4z" />
      <path d="M6 6H4a2 2 0 002 2m12-2h2a2 2 0 01-2 2" />
      <path d="M10 14h4v4h-4zM8 21h8" />
    </svg>
  );
}
function SpiralIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c-5 0-8-3-8-8s3-8 8-8 6 3 6 6-2 5-5 5-3-2-3-3 1-2 2-2" />
    </svg>
  );
}
function HorseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18c0-4 3-7 7-7h2l2-3 2 1-1 3 1 2v6H6z" />
      <path d="M14 11V7" />
      <circle cx="17" cy="8" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
function BreathIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="7" opacity="0.55" strokeDasharray="3 3" />
      <circle cx="12" cy="12" r="10" opacity="0.3" strokeDasharray="2 5" />
    </svg>
  );
}
function DuoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="4" />
      <circle cx="16" cy="15" r="4" />
      <path d="M5 20c1-3 3-4 5-4m3-4c0-1 1-3 3-4" />
    </svg>
  );
}
