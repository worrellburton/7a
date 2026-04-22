'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { SubstanceApproach as ApproachContent, ModalityIconId } from '@/lib/substances/types';

/** Substance — Phase 7. Flagship + 6-tile approach bento. */
export default function SubstanceApproach({ content }: { content: ApproachContent }) {
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

  const FlagshipIcon = iconFor(content.flagship.iconId);

  return (
    <section ref={ref} className="py-24 lg:py-32 bg-warm-bg overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14 lg:mb-20" style={style(0.05)}>
          <p className="section-label mb-5">{content.eyebrow}</p>
          <h2
            className="text-foreground font-bold tracking-tight mb-6"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 3.9vw, 3rem)',
              lineHeight: 1.03,
            }}
          >
            {content.title}
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {content.body}
          </p>
        </div>

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
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
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
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)',
                  lineHeight: 1.1,
                }}
              >
                {content.flagship.title}
              </h3>
              <p
                className="text-white/85 leading-relaxed text-[15.5px]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {content.flagship.body}
              </p>
            </div>
          </div>
        </article>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {content.modalities.map((m, i) => {
            const Icon = iconFor(m.iconId);
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
                <p
                  className="text-foreground/70 text-[14.5px] leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
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

function iconFor(id: ModalityIconId): (p: { className?: string }) => ReactElement {
  switch (id) {
    case 'brain-body':
      return BrainBodyIcon;
    case 'heart':
      return HeartIcon;
    case 'trophy':
      return TrophyIcon;
    case 'spiral':
      return SpiralIcon;
    case 'horse':
      return HorseIcon;
    case 'breath':
      return BreathIcon;
    case 'duo':
      return DuoIcon;
    case 'shield':
      return ShieldIcon;
    case 'compass':
      return CompassIcon;
    case 'hands':
      return HandsIcon;
  }
}

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
function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function CompassIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polygon points="16,8 12,14 8,16 12,10" fill="currentColor" stroke="none" />
    </svg>
  );
}
function HandsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 12v-3a2 2 0 014 0v3M10 12V7a2 2 0 014 0v5M14 12v-2a2 2 0 014 0v5c0 3-2 6-6 6s-6-3-6-6v-3" />
    </svg>
  );
}
