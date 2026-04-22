// Client-rendered editorial voices band. Takes 4 quotes and lays
// them out in the asymmetric 2-column masonry (matches the original
// TourVoices treatment) with scroll-in animation.
//
// Data-agnostic — the parent (usually LiveReviewsBand) decides
// whether to pass live Google reviews or hardcoded fallback content.

'use client';

import { useEffect, useRef, useState } from 'react';

export interface VoiceEntry {
  quote: string;
  name: string;
  tag: string;
  /** Either a profile photo URL (Google) or a landscape image path. */
  photo: string | null;
  /** When true, rendered with the Google verified-review attribution
      (small G badge over the avatar + 'Google review' caption). */
  fromGoogle?: boolean;
}

interface LiveReviewsBandClientProps {
  eyebrow: string;
  headlineLead: string;
  headlineAccent: string;
  headlineTail?: string;
  lede?: string;
  voices: VoiceEntry[];
  showGoogleFooter?: boolean;
}

export default function LiveReviewsBandClient({
  eyebrow,
  headlineLead,
  headlineAccent,
  headlineTail,
  lede,
  voices,
  showGoogleFooter,
}: LiveReviewsBandClientProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const left = voices.filter((_, i) => i % 2 === 0);
  const right = voices.filter((_, i) => i % 2 === 1);

  return (
    <section
      ref={ref}
      className="relative py-24 lg:py-32 bg-warm-bg overflow-hidden"
      aria-labelledby="voices-band-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 50% at 85% 20%, rgba(216,137,102,0.1) 0%, rgba(216,137,102,0) 65%), radial-gradient(ellipse 45% 50% at 10% 80%, rgba(188,107,74,0.08) 0%, rgba(188,107,74,0) 60%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-16 lg:mb-24"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">{eyebrow}</p>
          <h2
            id="voices-band-heading"
            className="text-foreground font-bold tracking-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.2rem, 4.3vw, 3.4rem)',
              lineHeight: 1.02,
            }}
          >
            {headlineLead}{' '}
            <em className="not-italic text-primary">{headlineAccent}</em>
            {headlineTail ? <>{' '}{headlineTail}</> : null}
          </h2>
          {lede ? (
            <p
              className="mt-6 text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {lede}
            </p>
          ) : null}
        </div>

        <div className="grid md:grid-cols-2 gap-x-8 lg:gap-x-14 gap-y-10 lg:gap-y-16">
          <div className="space-y-14 lg:space-y-20 lg:pr-4">
            {left.map((v, i) => (
              <VoiceCard key={v.name + i} voice={v} visible={visible} delay={0.1 + i * 0.2} />
            ))}
          </div>
          <div className="space-y-14 lg:space-y-20 lg:mt-20 lg:pl-4">
            {right.map((v, i) => (
              <VoiceCard key={v.name + i} voice={v} visible={visible} delay={0.22 + i * 0.2} />
            ))}
          </div>
        </div>

        {showGoogleFooter && (
          <div
            className="mt-14 lg:mt-16 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between border-t border-black/10 pt-8"
            style={{
              opacity: visible ? 1 : 0,
              transition: 'opacity 1s ease 0.8s',
            }}
          >
            <p
              className="text-foreground/60 text-[13px] flex items-center gap-2.5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <GoogleGlyph className="w-4 h-4 shrink-0" />
              Verified Google reviews. Updated hourly from our public Google listing.
            </p>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Seven+Arrows+Recovery&query_place_id=ChIJkx6TLLFX14YR1XG008rPWUM"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary font-semibold border-b border-primary/40 pb-0.5 tracking-[0.1em] uppercase text-[11px] hover:text-primary-dark hover:border-primary transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              See all on Google
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 17L17 7M17 7H9M17 7v8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

function VoiceCard({ voice, visible, delay }: { voice: VoiceEntry; visible: boolean; delay: number }) {
  const initial = (voice.name || '?').charAt(0).toUpperCase();
  return (
    <figure
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `all 1s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      <span
        aria-hidden="true"
        className="block text-accent leading-none mb-2"
        style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 5vw, 4.5rem)' }}
      >
        &ldquo;
      </span>
      <blockquote
        className="text-foreground leading-[1.2] mb-6"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.2rem, 1.8vw, 1.55rem)',
        }}
      >
        {voice.quote}
      </blockquote>
      <figcaption className="flex items-center gap-4">
        <div className="relative shrink-0">
          {voice.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={voice.photo}
              alt=""
              aria-hidden="true"
              className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-md"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full bg-primary text-white font-bold text-lg flex items-center justify-center ring-2 ring-white shadow-md"
              aria-hidden="true"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {initial}
            </div>
          )}
          {voice.fromGoogle && (
            <div
              className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 shadow"
              aria-hidden="true"
            >
              <GoogleGlyph className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
        <div>
          <p
            className="text-foreground font-bold"
            style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}
          >
            {voice.name}
          </p>
          <p
            className="text-foreground/55 text-[11px] uppercase tracking-[0.22em] font-semibold mt-0.5"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {voice.tag}
          </p>
        </div>
      </figcaption>
    </figure>
  );
}

function GoogleGlyph({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
