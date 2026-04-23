'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';

/**
 * Phase 6 — What's Included.
 *
 * Eight-tile icon grid answering the practical "what am I actually
 * getting?" question. Each tile is title + one-liner + an SVG glyph.
 * Stagger-in on scroll.
 */

type Item = {
  title: string;
  body: string;
  Icon: (p: { className?: string }) => ReactElement;
};

const items: Item[] = [
  {
    title: 'Individual therapy',
    body: 'Weekly 1:1 sessions with your primary clinician, trauma-informed throughout.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="10" r="2.5" />
        <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" />
      </svg>
    ),
  },
  {
    title: 'Group therapy',
    body: 'Evidence-based process groups and psychoeducation held by licensed clinicians.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="9" r="2.5" />
        <circle cx="5" cy="13" r="2" />
        <circle cx="19" cy="13" r="2" />
        <path d="M3 20c0-2 1.5-3.5 4-3.5M17 16.5c2.5 0 4 1.5 4 3.5M7 20c0-2.5 2-4 5-4s5 1.5 5 4" />
      </svg>
    ),
  },
  {
    title: 'Equine-assisted therapy',
    body: 'Work with several ranch horses across your stay, paired to what each week of treatment calls for.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 18c0-4 3-7 7-7h2l2-3 2 1-1 3 1 2v6H6z" />
        <path d="M14 11V7" />
      </svg>
    ),
  },
  {
    title: 'Chef-prepared meals',
    body: 'Three nutritious meals daily, made on-site with dietary accommodation.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 11h14M6 11v8a2 2 0 002 2h8a2 2 0 002-2v-8" />
        <path d="M9 11V6a3 3 0 116 0v5" />
      </svg>
    ),
  },
  {
    title: 'Holistic practice',
    body: 'Breathwork, yoga, mindfulness, and expressive arts and music for healing — non-clinical offerings that support the work.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v18M3 12h18M6 6l12 12M18 6l-12 12" />
      </svg>
    ),
  },
  {
    title: 'Family support sessions',
    body: 'Structured family support sessions and education so the people who love you move alongside you.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="8" r="2.5" />
        <circle cx="17" cy="8" r="2.5" />
        <circle cx="12" cy="15" r="2" />
        <path d="M4 15c0-1.8 1.5-3 3-3s3 1.2 3 3M14 15c0-1.8 1.5-3 3-3s3 1.2 3 3" />
      </svg>
    ),
  },
  {
    title: 'Detox coordination',
    body: 'When detox is clinically needed we coordinate a short stay at a trusted medical detox partner so you arrive stable.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v4m0 14v-4m9-5h-4M7 12H3" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
  {
    title: 'Aftercare planning',
    body: 'Structured step-down, alumni community, and ongoing outreach from day one.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12h4l3-8 4 16 3-8h4" />
      </svg>
    ),
  },
];

export default function WhatsIncluded() {
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
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-24 lg:py-32 bg-warm-bg" aria-labelledby="included-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-16"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">What&rsquo;s Included</p>
          <h2
            id="included-heading"
            className="text-foreground font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3.8vw, 2.9rem)', lineHeight: 1.05 }}
          >
            Everything you need, <em className="not-italic text-primary">under one roof</em>.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {items.map((item, i) => {
            const Icon = item.Icon;
            return (
              <article
                key={item.title}
                className="rounded-2xl bg-white p-6 border border-black/5 hover:border-primary/20 transition-colors"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(18px)',
                  transition: `all 0.8s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.06}s`,
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'rgba(188,107,74,0.1)' }}
                >
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-foreground font-bold mb-2" style={{ fontFamily: 'var(--font-display)', fontSize: '1.08rem' }}>
                  {item.title}
                </h3>
                <p className="text-foreground/70 text-[14px] leading-snug" style={{ fontFamily: 'var(--font-body)' }}>
                  {item.body}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
