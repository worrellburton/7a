'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';

/**
 * Holistic & Indigenous — Phase 4. Holistic modalities bento.
 *
 * Eight practices in a 4×2 editorial grid: yoga, breathwork, sound,
 * art, music, nutrition, mindfulness, movement. Each tile carries a
 * hand-drawn SVG glyph (no stock iconography), an uppercase category
 * tag, a serif title, and a short practice-first body copy.
 *
 * Bento uses a warm card surface on a dark-section bed so this
 * section reads as a break from the light editorial bands above.
 */

type Modality = {
  tag: string;
  title: string;
  body: string;
  Icon: (p: { className?: string }) => ReactElement;
};

const modalities: Modality[] = [
  {
    tag: 'Movement',
    title: 'Yoga',
    body: 'Trauma-informed hatha and restorative sequences. Breath paired to movement so the nervous system has somewhere to go.',
    Icon: YogaIcon,
  },
  {
    tag: 'Breath',
    title: 'Breathwork',
    body: 'Physiological sighs, box breathing, long exhale. Down-regulation clients can take anywhere after discharge.',
    Icon: BreathIcon,
  },
  {
    tag: 'Sound',
    title: 'Sound healing',
    body: 'Crystal bowls, gongs, and drums. Vibratory immersion that lets the body settle when words have run out.',
    Icon: SoundIcon,
  },
  {
    tag: 'Creative',
    title: 'Art therapy',
    body: 'Paint, clay, collage. A non-verbal route to what lives underneath the story we already know how to tell.',
    Icon: ArtIcon,
  },
  {
    tag: 'Creative',
    title: 'Music therapy',
    body: 'Songwriting, guided listening, rhythm circles. Music reaches the limbic system before the mind has a word for it.',
    Icon: MusicIcon,
  },
  {
    tag: 'Body',
    title: 'Nutrition',
    body: 'Whole-food meals prepared on-site, with education about the gut-brain axis that addiction shredded.',
    Icon: NutritionIcon,
  },
  {
    tag: 'Attention',
    title: 'Mindfulness',
    body: 'Formal sit, walking practice, noting. The capacity to be with what is, instead of leaving it.',
    Icon: MindfulnessIcon,
  },
  {
    tag: 'Body',
    title: 'Movement',
    body: 'Hiking, ranch work, outdoor play. Big-muscle movement metabolizes the stress hormones talk can&rsquo;t.',
    Icon: MovementIcon,
  },
];

export default function ModalitiesBento() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32 bg-dark-section text-white relative overflow-hidden"
      aria-labelledby="modalities-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 45% at 85% 15%, rgba(216,137,102,0.18) 0%, rgba(216,137,102,0) 65%), radial-gradient(ellipse 50% 50% at 10% 85%, rgba(107,42,20,0.28) 0%, rgba(107,42,20,0) 65%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-18"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-accent mb-5" style={{ fontFamily: 'var(--font-body)' }}>
            The practices
          </p>
          <h2
            id="modalities-heading"
            className="font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Eight practices, <em className="not-italic" style={{ color: 'var(--color-accent)' }}>held together</em>.
          </h2>
          <p className="text-white/75 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            No single practice does all the work. Held together, they give the
            nervous system a dozen different doors into regulation &mdash; and
            every client finds the ones that fit them.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {modalities.map((m, i) => (
            <article
              key={m.title}
              className="relative rounded-2xl p-6 lg:p-7 bg-white/[0.04] border border-white/10 hover:border-white/25 hover:bg-white/[0.07] transition-all duration-300"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(20px)',
                transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.12 + i * 0.07}s`,
              }}
            >
              <div
                className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5"
                style={{
                  background: 'linear-gradient(135deg, rgba(216,137,102,0.2) 0%, rgba(216,137,102,0.06) 100%)',
                  color: 'var(--color-accent)',
                }}
                aria-hidden="true"
              >
                <m.Icon className="w-7 h-7" />
              </div>
              <p
                className="text-[10px] font-semibold tracking-[0.24em] uppercase text-accent/85 mb-2"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {m.tag}
              </p>
              <h3
                className="font-bold mb-3"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.4rem',
                  lineHeight: 1.1,
                }}
              >
                {m.title}
              </h3>
              <p
                className="text-white/70 leading-relaxed text-[14.5px]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {m.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function stroke() {
  return {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

function YogaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...stroke()}>
      <circle cx="16" cy="6" r="2.5" />
      <path d="M16 8.5v6" />
      <path d="M8 13h16" />
      <path d="M16 14.5l-5 6" />
      <path d="M16 14.5l5 6" />
      <path d="M11 20.5l-3 5" />
      <path d="M21 20.5l3 5" />
    </svg>
  );
}

function BreathIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...stroke()}>
      <path d="M6 16c3-3 7-3 10 0s7 3 10 0" />
      <path d="M6 22c3-3 7-3 10 0s7 3 10 0" />
      <path d="M6 10c3-3 7-3 10 0s7 3 10 0" />
    </svg>
  );
}

function SoundIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...stroke()}>
      <circle cx="16" cy="16" r="3" />
      <circle cx="16" cy="16" r="7" />
      <circle cx="16" cy="16" r="11" />
    </svg>
  );
}

function ArtIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...stroke()}>
      <path d="M16 5c-6.5 0-11 4.5-11 10 0 4 3 7 7 7 1.5 0 2-1 2-2v-1c0-1 1-2 2-2h2c3 0 6-2 6-5 0-4-3-7-8-7z" />
      <circle cx="11" cy="13" r="1.2" />
      <circle cx="16" cy="10" r="1.2" />
      <circle cx="21" cy="13" r="1.2" />
    </svg>
  );
}

function MusicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...stroke()}>
      <path d="M12 22V8l13-3v14" />
      <circle cx="9" cy="22" r="3" />
      <circle cx="22" cy="19" r="3" />
    </svg>
  );
}

function NutritionIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...stroke()}>
      <path d="M16 7c-3 0-5 2-5 5 0 3 2 5 3 10 0 1 1 2 2 2s2-1 2-2c1-5 3-7 3-10 0-3-2-5-5-5z" />
      <path d="M16 7c-1-2 0-4 2-4" />
    </svg>
  );
}

function MindfulnessIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...stroke()}>
      <circle cx="16" cy="16" r="11" />
      <circle cx="16" cy="16" r="1.5" fill="currentColor" />
      <path d="M16 5v3" />
      <path d="M16 24v3" />
      <path d="M5 16h3" />
      <path d="M24 16h3" />
    </svg>
  );
}

function MovementIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...stroke()}>
      <circle cx="20" cy="7" r="2.5" />
      <path d="M20 9.5l-5 5 3 4-2 7" />
      <path d="M15 14.5l-5-1-3 4" />
      <path d="M18 18.5l5-2" />
    </svg>
  );
}
