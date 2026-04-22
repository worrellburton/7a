'use client';

import { useEffect, useRef, useState } from 'react';

function useCountUp(end: number, duration: number, started: boolean, decimals = 0) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!started) return;
    let startTime: number | null = null;
    let raf: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(parseFloat((eased * end).toFixed(decimals)));
      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [end, duration, started, decimals]);

  return value;
}

const stats = [
  {
    value: 4.9,
    suffix: '/5',
    label: 'Google Rating',
    description: 'Based on 27 verified reviews',
    decimals: 1,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ),
  },
  {
    value: 90,
    suffix: '+',
    label: 'Day Programs',
    description: 'Extended care for lasting recovery',
    decimals: 0,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    value: 6,
    suffix: ':1',
    label: 'Client to Staff',
    description: 'Truly personalized attention',
    decimals: 0,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    value: 24,
    suffix: '/7',
    label: 'Admissions',
    description: 'Begin treatment within 48 hours',
    decimals: 0,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
      </svg>
    ),
  },
];

type Badge = {
  name: string;
  abbr: string;
  seal?: { src: string; href: string; width: number; height: number; alt: string };
};

const BADGES: Badge[] = [
  {
    name: 'Joint Commission Accredited',
    abbr: 'JCAHO',
    seal: {
      src: 'https://xbirikzsrwmgqxlazglm.supabase.co/storage/v1/object/public/public-images/site-gallery/1776808204322-pzyzhrow2ib-joint-commission-gold-seal-of-approval.jpg',
      href: 'https://www.qualitycheck.org/',
      width: 120,
      height: 120,
      alt: 'Joint Commission Gold Seal of Approval',
    },
  },
  {
    name: 'LegitScript Certified',
    abbr: 'LegitScript',
    seal: {
      src: 'https://static.legitscript.com/seals/11087571.png',
      href: 'https://www.legitscript.com/websites/?checker_keywords=sevenarrowsrecovery.com',
      width: 65,
      height: 79,
      alt: 'Verify Approval for www.sevenarrowsrecovery.com',
    },
  },
  { name: 'CARF Accredited', abbr: 'CARF' },
  { name: 'HIPAA Compliant', abbr: 'HIPAA' },
];

export default function StatsSection() {
  const ref = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-12 lg:py-16 bg-warm-bg"
      aria-label="Accreditations and key statistics"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Accreditations row — previously rendered as its own section
            on a white backdrop. Merged here so credentials and outcome
            stats read as one trust block instead of two strips. */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 lg:gap-x-12 pb-8 lg:pb-10 mb-10 lg:mb-12 border-b border-foreground/10">
          <span
            className="text-xs tracking-[0.15em] uppercase text-foreground/40 font-semibold"
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
                <img
                  src={badge.seal.src}
                  alt={badge.seal.alt}
                  width={badge.seal.width}
                  height={badge.seal.height}
                  className="h-10 w-auto"
                />
                <span
                  className="text-xs text-foreground/60 hidden sm:block"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {badge.name}
                </span>
              </a>
            ) : (
              <div
                key={badge.abbr}
                className="flex items-center gap-2 opacity-50 hover:opacity-80 transition-opacity"
              >
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary tracking-wide">{badge.abbr}</span>
                </div>
                <span
                  className="text-xs text-foreground/60 hidden sm:block"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {badge.name}
                </span>
              </div>
            )
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {stats.map((stat, i) => {
            const count = useCountUp(stat.value, 1800, started, stat.decimals);
            return (
              <StatCard
                key={stat.label}
                stat={stat}
                count={count}
                started={started}
                index={i}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StatCard({
  stat,
  count,
  started,
  index,
}: {
  stat: typeof stats[number];
  count: number;
  started: boolean;
  index: number;
}) {
  return (
    <div
      className="flex flex-col items-center text-center transition-all duration-700"
      style={{
        opacity: started ? 1 : 0,
        transform: started ? 'translateY(0)' : 'translateY(20px)',
        transitionDelay: `${index * 100}ms`,
      }}
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
        {stat.icon}
      </div>
      <div className="flex items-baseline justify-center gap-0.5 mb-1">
        <span className="text-4xl lg:text-5xl font-bold text-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
          {stat.decimals ? count.toFixed(stat.decimals) : count}
        </span>
        {stat.suffix && (
          <span className="text-xl font-bold text-foreground/40">{stat.suffix}</span>
        )}
      </div>
      <p className="text-sm font-semibold text-foreground mb-1" style={{ fontFamily: 'var(--font-body)' }}>
        {stat.label}
      </p>
      <p className="text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
        {stat.description}
      </p>
    </div>
  );
}
