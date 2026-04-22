'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';

/**
 * Evidence-Based — Phase 7. Clinical modalities bento.
 *
 * A two-tier layout:
 *   - Flagship SCBT tile spans the full top row with an accent
 *     gradient and a bigger glyph. SCBT is our house-integrated
 *     cognitive-behavioral variant, so it anchors the grid.
 *   - Nine smaller icon+copy tiles in a 3-col grid (DBT, IFS, ART,
 *     EAP, Experiential, Expressive Arts, Trauma Yoga, Breathwork,
 *     Mindfulness).
 * Every tile has a custom hand-drawn SVG glyph — no stock icons.
 * Stagger-in on scroll, subtle border-hover states.
 */

type Modality = {
  title: string;
  abbr?: string;
  body: string;
  Icon: (p: { className?: string }) => ReactElement;
};

const flagship: Modality = {
  title: 'Somatic Cognitive Behavioral Therapy',
  abbr: 'SCBT',
  body: 'Our house-integrated variant of CBT — classical cognitive restructuring layered with somatic awareness. Clients track the body while they track the thought. Neither gets skipped.',
  Icon: BrainBodyIcon,
};

const modalities: Modality[] = [
  {
    title: 'Dialectical Behavior Therapy',
    abbr: 'DBT',
    body: 'Distress tolerance, emotion regulation, and interpersonal effectiveness, held in a container of mindfulness.',
    Icon: BalanceIcon,
  },
  {
    title: 'Internal Family Systems',
    abbr: 'IFS',
    body: 'Unblending from protective parts to re-contact the Self — the compassionate core underneath.',
    Icon: FamilySystemsIcon,
  },
  {
    title: 'Accelerated Resolution Therapy',
    abbr: 'ART',
    body: 'Eye-movement-based protocol for resolving trauma memories rapidly, with client-led titration throughout.',
    Icon: EyeMotionIcon,
  },
  {
    title: 'Equine-Assisted Psychotherapy',
    abbr: 'EAP',
    body: 'Horses mirror nervous-system states with zero judgment. The body learns what safe co-regulation feels like.',
    Icon: HorseIcon,
  },
  {
    title: 'Experiential Therapy',
    body: 'Psychodrama, role play, sand tray, nature-based exercises — the material comes out through doing, not just saying.',
    Icon: ExperientialIcon,
  },
  {
    title: 'Expressive Arts Therapy',
    body: 'Drawing, collage, movement, sound — routes to insight that bypass the verbal bottleneck.',
    Icon: ArtsIcon,
  },
  {
    title: 'Trauma-Informed Yoga',
    body: 'Invitational, consent-based yoga that rebuilds a sense of agency inside the body.',
    Icon: YogaIcon,
  },
  {
    title: 'Breathwork',
    body: 'Cardiac-coherent and restorative breath practices that move the nervous system into measurable regulation.',
    Icon: BreathIcon,
  },
  {
    title: 'Mindfulness Practices',
    body: 'Daily formal and informal practice that trains present-moment attention — the engine of every other modality.',
    Icon: MindfulnessIcon,
  },
];

export default function Modalities() {
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
    <section ref={ref} className="py-24 lg:py-32 bg-warm-bg overflow-hidden" aria-labelledby="modalities-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14 lg:mb-20" style={style(0.05)}>
          <p className="section-label mb-5">Integrative, Evidence-Based Care</p>
          <h2
            id="modalities-heading"
            className="text-foreground font-bold tracking-tight mb-6"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3.9vw, 3rem)', lineHeight: 1.03 }}
          >
            Ten modalities, <em className="not-italic text-primary">one relational spine</em>.
          </h2>
          <p className="text-foreground/70 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            Every service we offer is delivered through a polyvagal-informed
            lens. The modalities do the specific work; the relationship holds
            the container.
          </p>
        </div>

        {/* Flagship SCBT */}
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
                'radial-gradient(ellipse 45% 55% at 85% 20%, rgba(216,137,102,0.32) 0%, rgba(216,137,102,0) 65%)',
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
                House-integrated · {flagship.abbr}
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

        {/* Nine modality tiles */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {modalities.map((m, i) => {
            const Icon = m.Icon;
            return (
              <article
                key={m.title}
                className="rounded-2xl bg-white p-6 border border-black/5 hover:border-primary/25 hover:shadow-md transition-all"
                style={style(0.2 + i * 0.06)}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(188,107,74,0.1)' }}
                  >
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                      <h3
                        className="text-foreground font-bold"
                        style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', lineHeight: 1.15 }}
                      >
                        {m.title}
                      </h3>
                      {m.abbr && (
                        <span
                          className="text-[10px] font-semibold tracking-[0.14em] uppercase text-primary px-1.5 py-0.5 rounded bg-primary/10"
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          {m.abbr}
                        </span>
                      )}
                    </div>
                    <p className="text-foreground/70 text-[14.5px] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                      {m.body}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <p
          className="mt-10 text-center text-[11px] uppercase tracking-[0.22em] text-foreground/45 font-semibold"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.9s ease 1s',
          }}
        >
          All services delivered through a polyvagal-informed lens
        </p>
      </div>
    </section>
  );
}

/* ── Hand-drawn glyphs (no stock) ─────────────────────────────────── */

function BrainBodyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="14" r="6" />
      <path d="M24 20v8" />
      <path d="M18 28h12l2 6-4 6h-8l-4-6z" />
      <path d="M24 28v14" />
      <circle cx="24" cy="14" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}
function BalanceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18" />
      <path d="M5 8l-3 7c1 2 5 2 6 0l-3-7z" />
      <path d="M19 8l-3 7c1 2 5 2 6 0l-3-7z" />
    </svg>
  );
}
function FamilySystemsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="4" cy="12" r="1.5" />
      <circle cx="20" cy="12" r="1.5" />
      <circle cx="12" cy="20" r="1.5" />
      <path d="M12 5.5v3M5.5 12h3M15.5 12h3M12 15.5v3" />
    </svg>
  );
}
function EyeMotionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
      <path d="M4 12h-2M20 12h2" />
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
function ExperientialIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="12" r="3" />
      <circle cx="17" cy="12" r="3" />
      <path d="M10 12h4" />
      <path d="M5 19l2-4M17 15l2 4" />
    </svg>
  );
}
function ArtsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="7" cy="9" r="1" fill="currentColor" stroke="none" />
      <circle cx="11" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="10" r="1" fill="currentColor" stroke="none" />
      <path d="M12 16c-2 0-3 1-3 2.5 0 1 1 1.5 3 1.5 1 0 2 0 2-1s-1-3-2-3z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function YogaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v5" />
      <path d="M5 14l7-2 7 2" />
      <path d="M12 12v6" />
      <path d="M9 20l3-2 3 2" />
    </svg>
  );
}
function BreathIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="7" opacity="0.6" strokeDasharray="3 3" />
      <circle cx="12" cy="12" r="10" opacity="0.3" strokeDasharray="2 5" />
    </svg>
  );
}
function MindfulnessIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s7-5 7-12a7 7 0 10-14 0c0 7 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
