'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { ReviewBubbleData } from './ReviewBubble';

/**
 * Landing page — stats band + featured review card (client shell).
 *
 * Owns the IntersectionObserver so the counters only start when the
 * band is in view, and the expand/collapse state for the featured
 * review quote. The review is supplied by the server parent so it
 * pulls from the same cached Places fetch as the rest of the site.
 *
 * Also carries the accreditation strip at the top of the band so
 * credentials + KPIs + real review read as a single trust block
 * instead of several stacked strips.
 */

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

interface StatConfig {
  end: number;
  suffix: string;
  label: string;
  description: string;
  decimals: number;
  icon: ReactElement;
}

const stats: StatConfig[] = [
  {
    end: 4.9,
    suffix: '/5',
    label: 'Google Rating',
    description: 'Across verified reviews',
    decimals: 1,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ),
  },
  {
    end: 90,
    suffix: '+',
    label: 'Day Programs',
    description: 'Extended care for lasting recovery',
    decimals: 0,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    end: 6,
    suffix: ':1',
    label: 'Client to Staff',
    description: 'Truly personalized attention',
    decimals: 0,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    end: 24,
    suffix: '/7',
    label: 'Admissions',
    description: 'Begin treatment within 48 hours',
    decimals: 0,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
      </svg>
    ),
  },
];

function useCountUp(end: number, duration: number, started: boolean, decimals: number) {
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
      if (progress < 1) raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [end, duration, started, decimals]);

  return value;
}

function StatTile({ stat, started, index }: { stat: StatConfig; started: boolean; index: number }) {
  const count = useCountUp(stat.end, 1800, started, stat.decimals);
  return (
    <div
      className="flex flex-col items-start text-left"
      style={{
        opacity: started ? 1 : 0,
        transform: started ? 'translateY(0)' : 'translateY(16px)',
        transition: `all 0.7s cubic-bezier(0.16,1,0.3,1) ${index * 100}ms`,
      }}
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
        {stat.icon}
      </div>
      <div className="flex items-baseline gap-0.5 mb-1">
        <span
          className="text-4xl lg:text-[2.75rem] font-bold text-foreground tabular-nums"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {stat.decimals ? count.toFixed(stat.decimals) : Math.round(count)}
        </span>
        {stat.suffix && (
          <span className="text-xl font-bold text-foreground/40">{stat.suffix}</span>
        )}
      </div>
      <p className="text-sm font-semibold text-foreground mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>
        {stat.label}
      </p>
      <p className="text-xs text-foreground/55 leading-snug" style={{ fontFamily: 'var(--font-body)' }}>
        {stat.description}
      </p>
    </div>
  );
}

function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 ${star <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

interface Props {
  review: ReviewBubbleData | null;
  rating: number;
  total: number;
}

export default function HeroStatsBandClient({ review, rating, total }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);
  const [expanded, setExpanded] = useState(false);

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

  const SHORT_LEN = 240;
  const isLong = review ? review.text.length > SHORT_LEN : false;
  const initial = review ? (review.name.trim().charAt(0) || '•') : '•';
  const displayText = review
    ? expanded || !isLong
      ? review.text
      : `${review.text.slice(0, SHORT_LEN).replace(/\s+\S*$/, '')}…`
    : '';

  return (
    <section
      ref={ref}
      className="py-16 lg:py-20 bg-warm-bg"
      aria-label="Seven Arrows at a glance"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 lg:gap-x-12 pb-10 lg:pb-12 mb-12 lg:mb-14 border-b border-foreground/10">
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
            ),
          )}
        </div>
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div className={review ? 'lg:col-span-7' : 'lg:col-span-12'}>
            <p className="section-label mb-5">At a glance</p>
            <h2
              className="text-foreground font-bold tracking-tight mb-8 lg:mb-10 max-w-xl"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.6rem, 2.6vw, 2rem)',
                lineHeight: 1.1,
              }}
            >
              A boutique ranch program you can actually measure.
            </h2>
            <div className="grid grid-cols-2 gap-y-10 gap-x-8 lg:gap-x-12">
              {stats.map((s, i) => (
                <StatTile key={s.label} stat={s} started={started} index={i} />
              ))}
            </div>
          </div>

          {review && (
          <div
            className="lg:col-span-5"
            style={{
              opacity: started ? 1 : 0,
              transform: started ? 'translateX(0)' : 'translateX(20px)',
              transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.4s',
            }}
          >
            <article
              className="relative bg-white rounded-3xl p-7 lg:p-8 shadow-[0_30px_60px_-30px_rgba(42,15,10,0.35)] border border-black/5"
              aria-label={`Google review by ${review.name}`}
            >
              <div className="absolute -top-3 left-7 inline-flex items-center gap-2 bg-white border border-black/5 rounded-full pl-2 pr-3 py-1 shadow-sm">
                <GoogleIcon className="w-4 h-4" />
                <span
                  className="text-[10px] tracking-[0.18em] uppercase font-bold text-foreground/70"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Verified Google review
                </span>
              </div>

              <div className="flex items-center justify-between mb-4 mt-2">
                <div className="flex items-center gap-3">
                  {review.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={review.photoUrl}
                      alt=""
                      className="w-11 h-11 rounded-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div
                      className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-white font-bold"
                      aria-hidden="true"
                    >
                      {initial}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-foreground text-sm" style={{ fontFamily: 'var(--font-body)' }}>
                      {review.name}
                    </p>
                    <p className="text-foreground/50 text-xs" style={{ fontFamily: 'var(--font-body)' }}>
                      {review.date}
                    </p>
                  </div>
                </div>
                <ReviewStars rating={review.rating} />
              </div>

              <p
                className="text-foreground/80 leading-relaxed text-[15px]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                &ldquo;{displayText}&rdquo;
              </p>
              {isLong && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-3 text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {expanded ? 'Show less' : 'Read more'}
                </button>
              )}

              <div className="mt-6 pt-5 border-t border-black/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GoogleIcon className="w-4 h-4" />
                  <span className="text-sm font-semibold text-foreground" style={{ fontFamily: 'var(--font-body)' }}>
                    {rating.toFixed(1)}
                  </span>
                  <span className="text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
                    · {total.toLocaleString('en-US')} review{total === 1 ? '' : 's'}
                  </span>
                </div>
                <a
                  href="#reviews-heading"
                  className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors inline-flex items-center gap-1"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  See more
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </a>
              </div>
            </article>
          </div>
          )}
        </div>
      </div>
    </section>
  );
}
