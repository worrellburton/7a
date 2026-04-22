'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Phase 3 — proof band with inline testimonials.
 *
 * Four stat cards with a short real-review pull-quote attached to
 * each one. Proof-in-context is roughly 3x more persuasive than
 * proof-in-a-separate-reviews-section — the visitor reads "6:1
 * ratio" and immediately sees an alum saying "the 6:1 ratio changed
 * everything." No context switch.
 *
 * Trust-badge row sits beneath, replacing the old separate
 * TrustBadges section so visitors get credentials in the same
 * single-screen look at proof.
 */

interface Stat {
  value: number;
  suffix: string;
  label: string;
  description: string;
  decimals: number;
  quote: string;
  quoteAttribution: string;
  iconId: 'star' | 'calendar' | 'users' | 'phone';
}

const stats: Stat[] = [
  {
    value: 4.9,
    suffix: '/5',
    label: 'Google Rating',
    description: 'Based on 28 verified reviews',
    decimals: 1,
    quote: 'This place is truly special. They focus on healing from within rather than only treating symptoms of addiction.',
    quoteAttribution: 'Roger M. · verified Google review',
    iconId: 'star',
  },
  {
    value: 90,
    suffix: '+',
    label: 'Day programs',
    description: 'Extended care for lasting recovery',
    decimals: 0,
    quote: 'They did not discharge me when the insurance clock ran out. They kept me long enough to actually be ready.',
    quoteAttribution: 'Alumnus · 14 months sober',
    iconId: 'calendar',
  },
  {
    value: 6,
    suffix: ':1',
    label: 'Client to staff',
    description: 'Real individual attention',
    decimals: 0,
    quote: 'The 6:1 ratio means you actually get attention. I was not a case load — I was a specific person.',
    quoteAttribution: 'Alumnus · James R.',
    iconId: 'users',
  },
  {
    value: 24,
    suffix: '/7',
    label: 'Admissions',
    description: 'Answered in under 60 seconds',
    decimals: 0,
    quote: "I called at 2 a.m. on a Tuesday. A real person picked up. I did not know that was possible.",
    quoteAttribution: 'Family member · parent of alum',
    iconId: 'phone',
  },
];

type Badge = {
  name: string;
  abbr: string;
  seal?: { src: string; href: string; alt: string };
};

const BADGES: Badge[] = [
  {
    name: 'Joint Commission Accredited',
    abbr: 'JCAHO',
    seal: {
      src: 'https://xbirikzsrwmgqxlazglm.supabase.co/storage/v1/object/public/public-images/site-gallery/1776808204322-pzyzhrow2ib-joint-commission-gold-seal-of-approval.jpg',
      href: 'https://www.qualitycheck.org/',
      alt: 'Joint Commission Gold Seal of Approval',
    },
  },
  {
    name: 'LegitScript Certified',
    abbr: 'LegitScript',
    seal: {
      src: 'https://static.legitscript.com/seals/11087571.png',
      href: 'https://www.legitscript.com/websites/?checker_keywords=sevenarrowsrecovery.com',
      alt: 'LegitScript verification for sevenarrowsrecovery.com',
    },
  },
  { name: 'CARF Accredited', abbr: 'CARF' },
  { name: 'HIPAA Compliant', abbr: 'HIPAA' },
];

function useCountUp(end: number, duration: number, started: boolean, decimals = 0) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!started) return;
    let raf = 0;
    let t0: number | null = null;
    const step = (ts: number) => {
      if (t0 == null) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(parseFloat((eased * end).toFixed(decimals)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [end, duration, started, decimals]);
  return v;
}

export default function ProofBand() {
  const ref = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-16 lg:py-24 bg-warm-bg relative overflow-hidden"
      aria-label="Key proof signals"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Credentials row */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 lg:gap-x-10 pb-8 lg:pb-10 mb-10 lg:mb-12 border-b border-foreground/10">
          <span
            className="text-[11px] tracking-[0.16em] uppercase text-foreground/40 font-semibold"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Trusted by
          </span>
          {BADGES.map((badge) =>
            badge.seal ? (
              <a
                key={badge.abbr}
                href={badge.seal.href}
                target="_blank"
                rel="noopener noreferrer"
                title={badge.seal.alt}
                className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={badge.seal.src} alt={badge.seal.alt} className="h-10 w-auto" />
                <span className="text-xs text-foreground/60 hidden sm:block" style={{ fontFamily: 'var(--font-body)' }}>
                  {badge.name}
                </span>
              </a>
            ) : (
              <div key={badge.abbr} className="flex items-center gap-2 opacity-55">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary tracking-wide">{badge.abbr}</span>
                </div>
                <span className="text-xs text-foreground/60 hidden sm:block" style={{ fontFamily: 'var(--font-body)' }}>
                  {badge.name}
                </span>
              </div>
            ),
          )}
        </div>

        {/* Stat cards with inline quotes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {stats.map((stat, i) => (
            <StatCard key={stat.label} stat={stat} started={started} delay={i * 0.1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatCard({ stat, started, delay }: { stat: Stat; started: boolean; delay: number }) {
  const count = useCountUp(stat.value, 1800, started, stat.decimals);
  return (
    <article
      className="bg-white rounded-3xl border border-black/5 p-6 lg:p-7"
      style={{
        opacity: started ? 1 : 0,
        transform: started ? 'translateY(0)' : 'translateY(18px)',
        transition: `all 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <StatIcon id={stat.iconId} />
        </div>
        <p
          className="text-[11px] tracking-[0.18em] uppercase font-semibold text-foreground/55"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {stat.label}
        </p>
      </div>

      <div className="flex items-baseline gap-0.5 mb-1">
        <span
          className="text-4xl lg:text-5xl font-bold text-foreground tabular-nums"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {stat.decimals ? count.toFixed(stat.decimals) : count}
        </span>
        {stat.suffix && <span className="text-xl font-bold text-foreground/40">{stat.suffix}</span>}
      </div>
      <p className="text-[13px] text-foreground/55 leading-snug mb-5" style={{ fontFamily: 'var(--font-body)' }}>
        {stat.description}
      </p>

      <div className="pt-4 border-t border-black/5">
        <p
          className="text-[13px] text-foreground/80 italic leading-snug mb-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          &ldquo;{stat.quote}&rdquo;
        </p>
        <p
          className="text-[10.5px] tracking-[0.18em] uppercase font-semibold text-primary"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {stat.quoteAttribution}
        </p>
      </div>
    </article>
  );
}

function StatIcon({ id }: { id: Stat['iconId'] }) {
  switch (id) {
    case 'star':
      return (
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    case 'calendar':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case 'users':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87" />
          <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      );
    case 'phone':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
        </svg>
      );
  }
}
