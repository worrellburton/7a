'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactElement } from 'react';

/**
 * Phase 4 — "The Seven Arrows Difference" bento.
 *
 * Flagship Indigenous Healing Traditions tile spans the top. A tall
 * campfire-ceremony photo anchors the left column. The three remaining
 * differentiators (Evidence-Based, Equine, 1-on-1) live as icon+copy
 * tiles along the right. Stagger-in animation gated by
 * IntersectionObserver.
 */

type Diff = {
  title: string;
  body: string;
  href: string;
  cta: string;
  Icon: (props: { className?: string }) => ReactElement;
};

const diffs: Diff[] = [
  {
    title: 'Evidence-Based & Medical Care',
    body: 'Multidisciplinary clinical care grounded in CBT, DBT, EMDR, and Motivational Interviewing, with medication management and integrated dual-diagnosis protocols for anxiety, depression, PTSD, and co-occurring conditions.',
    href: '/our-program/evidence-based',
    cta: 'Explore our evidence-based methods',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3v5a2 2 0 0 1-.59 1.59L5 13M9 3l6 0M9 3a15.3 15.3 0 0 0-.75.08M15 3v5a2 2 0 0 0 .59 1.59L19 13" />
        <path d="M19 13l-1.48 4.45A2.25 2.25 0 0 1 15.38 19H8.62a2.25 2.25 0 0 1-2.14-1.55L5 13Z" />
      </svg>
    ),
  },
  {
    title: 'Dedicated Equine Therapy',
    body: 'Each client is paired with their own horse for the duration of treatment. One-on-one work in the open desert builds trust, emotional regulation, and the kind of nonverbal honesty that accelerates breakthroughs.',
    href: '/our-program/equine-assisted',
    cta: 'Discover our equine therapy program',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 18c0-4 3-7 7-7h2l2-3 2 1-1 3 1 2v6H6z" />
        <path d="M8 18v-4" />
        <path d="M14 11V7" />
      </svg>
    ),
  },
  {
    title: '1-on-1 Individualized Care',
    body: 'Deliberately small census and low client-to-staff ratios. Every plan is customized, every therapist knows your name, and group sessions stay intimate — peers instead of a crowd.',
    href: '/our-program/who-we-help',
    cta: 'Who we help',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-1a7 7 0 0 1 14 0v1" />
      </svg>
    ),
  },
];

export default function WhyDifference() {
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

  const style = (delay: number) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(22px)',
    transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  });

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32 bg-warm-bg overflow-hidden"
      aria-labelledby="difference-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14 lg:mb-20" style={style(0.05)}>
          <p className="section-label mb-5">What Sets Us Apart</p>
          <h2
            id="difference-heading"
            className="text-foreground font-bold tracking-tight mb-6"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 3.8vw, 2.9rem)',
              lineHeight: 1.05,
            }}
          >
            The Seven Arrows <em className="not-italic text-primary">difference</em>.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Our treatment philosophy blends multiple clinical disciplines into a
            single cohesive program. Every element is designed to treat the whole
            person &mdash; body, mind, and spirit.
          </p>
        </div>

        <div className="grid gap-4 lg:gap-5 lg:grid-cols-12 lg:auto-rows-[minmax(180px,auto)]">
          {/* Flagship Indigenous tile — top full-width row */}
          <article
            className="lg:col-span-12 p-8 lg:p-10 rounded-2xl text-white relative overflow-hidden"
            style={{
              ...style(0.1),
              background:
                'linear-gradient(115deg, var(--color-dark-section) 0%, var(--color-primary-dark) 85%)',
            }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse 45% 60% at 85% 20%, rgba(216,137,102,0.35) 0%, rgba(216,137,102,0) 65%)',
              }}
            />
            <div className="relative max-w-3xl">
              <p
                className="text-[11px] font-semibold tracking-[0.22em] uppercase text-accent mb-4"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                What truly sets us apart
              </p>
              <h3
                className="font-bold tracking-tight mb-4"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.6rem, 2.4vw, 2.1rem)',
                  lineHeight: 1.1,
                }}
              >
                Holistic &amp; Indigenous Healing
              </h3>
              <p
                className="text-white/85 leading-relaxed text-[15.5px] mb-5"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Breathwork, yoga, sound healing, and mindfulness alongside sweat lodge
                ceremonies, smudging rituals, talking circles, and land-based therapies
                rooted in centuries of earth-based wisdom. A full-spectrum holistic
                practice that complements clinical treatment and offers a spiritual
                dimension of healing conventional programs rarely provide.
              </p>
              <Link
                href="/our-program/holistic-approaches"
                className="inline-flex items-center gap-2 text-accent font-semibold border-b border-accent/60 hover:border-accent pb-1 tracking-[0.1em] uppercase text-[12px] transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Learn about our holistic approach
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </article>

          {/* Tall campfire photo anchor — spans rows 2–3 on left */}
          <div
            className="lg:col-span-5 lg:row-span-2 rounded-2xl overflow-hidden relative min-h-[320px]"
            style={style(0.2)}
          >
            <img
              src="/images/campfire-ceremony-circle.webp"
              alt="Ceremony circle around an evening campfire at Seven Arrows."
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(10,5,3,0.05) 35%, rgba(10,5,3,0.82) 100%)',
              }}
            />
            <p
              className="absolute bottom-5 left-5 right-5 text-white italic leading-snug text-base lg:text-lg"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              &ldquo;The land does the work that the room cannot.&rdquo;
            </p>
          </div>

          {/* Three remaining differentiators stack up the right column */}
          {diffs.map((d, i) => {
            const Icon = d.Icon;
            return (
              <article
                key={d.title}
                className="lg:col-span-7 rounded-2xl bg-white p-6 lg:p-7 border border-black/5 hover:border-primary/20 transition-colors"
                style={style(0.25 + i * 0.07)}
              >
                <div className="flex items-start gap-5">
                  <div
                    className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(188,107,74,0.1)' }}
                  >
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3
                      className="font-bold mb-2 text-foreground"
                      style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}
                    >
                      {d.title}
                    </h3>
                    <p
                      className="text-foreground/70 text-[14.5px] leading-relaxed mb-3"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {d.body}
                    </p>
                    <Link
                      href={d.href}
                      className="inline-flex items-center gap-1.5 text-primary font-semibold text-[12px] tracking-[0.08em] uppercase hover:text-primary-dark transition-colors"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {d.cta}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
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
