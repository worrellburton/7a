'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Interventions — Phase 4. "When to intervene."
 *
 * Eight signal cards arranged in a responsive grid. Each card has a
 * hand-drawn glyph, a short headline, and one sentence of "we see
 * this when" language. On scroll-in the cards stagger in with a lift
 * and a soft glow; on hover the glyph halo intensifies.
 */

type Signal = {
  title: string;
  body: string;
  Icon: (p: { className?: string }) => React.ReactElement;
};

const signals: Signal[] = [
  {
    title: 'The conversation has happened — more than once.',
    body: 'You have already said "we need to talk about this" in different tones, different rooms, different months. Nothing has changed.',
    Icon: SpeechIcon,
  },
  {
    title: 'Consequences are stacking.',
    body: 'A job, a driver\'s license, a custody arrangement, a lease — the fallout is no longer hypothetical. Something real is about to go.',
    Icon: StackIcon,
  },
  {
    title: 'Trust is running on fumes.',
    body: 'Promises are made and broken on a pattern you can now predict. The word "tomorrow" has lost meaning in your house.',
    Icon: FumesIcon,
  },
  {
    title: 'Someone in the system is breaking.',
    body: 'A spouse, a parent, a teenage kid — the people orbiting the addiction are showing symptoms of their own. The family is the patient too.',
    Icon: BreakIcon,
  },
  {
    title: 'A medical scare has happened.',
    body: 'An overdose, a hospitalization, a blackout, a near-miss on the road. The body is now speaking where the mind would not.',
    Icon: HeartIcon,
  },
  {
    title: 'Lying has become the default.',
    body: 'Not selective lying — reflexive. Even benign questions get false answers because the addiction has rewritten the shape of honesty.',
    Icon: MaskIcon,
  },
  {
    title: 'Money is disappearing.',
    body: 'Savings, gifts, credit lines, rent money. The math of the household has quietly become the math of the addiction.',
    Icon: CoinIcon,
  },
  {
    title: 'You\'re researching at 2 a.m.',
    body: 'You have a burner browser tab open on your phone every week. You\'re reading pages like this one. That is not nothing — it is a signal.',
    Icon: MoonIcon,
  },
];

export default function WhenToIntervene() {
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
      className="py-24 lg:py-32 bg-warm-bg relative overflow-hidden"
      aria-labelledby="signs-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-16"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">When to Intervene</p>
          <h2
            id="signs-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.05,
            }}
          >
            Eight signals families <em className="not-italic text-primary">recognize</em>.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            No one of these alone is a reason to call. Two or three of
            them showing up in the same month usually is.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {signals.map((s, i) => {
            const Icon = s.Icon;
            return (
              <article
                key={s.title}
                className="group relative rounded-2xl bg-white border border-black/5 p-5 lg:p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(22px)',
                  transition: `all 0.85s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.05}s`,
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-all group-hover:scale-110"
                  style={{
                    background: 'linear-gradient(135deg, rgba(216,137,102,0.14) 0%, rgba(107,42,20,0.08) 100%)',
                    color: 'var(--color-primary-dark)',
                  }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3
                  className="text-foreground font-bold mb-2"
                  style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', lineHeight: 1.2 }}
                >
                  {s.title}
                </h3>
                <p
                  className="text-foreground/65 text-[13.5px] leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {s.body}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Hand-drawn glyphs ──────────────────────────────────────────── */
function SpeechIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a7 7 0 0114 0c0 4-4 6-7 6H6l-3 2v-3a6 6 0 010-5z" />
      <path d="M8 11h6M8 14h4" />
    </svg>
  );
}
function StackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="14" width="16" height="5" rx="1" />
      <rect x="6" y="8" width="12" height="5" rx="1" />
      <rect x="8" y="2" width="8" height="5" rx="1" />
    </svg>
  );
}
function FumesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20s2-5 8-5 8 5 8 5" />
      <path d="M7 15c1-2 0-4 1-5M12 14c2-3 0-5 1-7M17 15c1-2 0-4 1-6" />
    </svg>
  );
}
function BreakIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2" />
      <path d="M4 20c0-3 2-5 5-5s5 2 5 5" />
      <path d="M14 20c0-2 1-4 3-4s3 2 3 4" />
      <path d="M12 13l-2 4" strokeDasharray="1.5 2" />
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
function MaskIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6c6-2 10-2 16 0-1 8-5 13-8 13s-7-5-8-13z" />
      <circle cx="9" cy="10" r="1" fill="currentColor" />
      <circle cx="15" cy="10" r="1" fill="currentColor" />
      <path d="M10 15c1 1 3 1 4 0" />
    </svg>
  );
}
function CoinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v10M9 10h4.5a1.5 1.5 0 010 3H9h4.5a1.5 1.5 0 010 3H9" />
    </svg>
  );
}
function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14a8 8 0 01-10-10 8 8 0 1010 10z" />
      <circle cx="17" cy="7" r="0.7" fill="currentColor" />
      <circle cx="14" cy="4" r="0.5" fill="currentColor" />
    </svg>
  );
}
