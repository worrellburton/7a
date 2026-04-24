'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

/* ── Payer trust strip ─────────────────────────────────────────────── */

const BRANDFETCH_CLIENT_ID = '1id3n10pdBTarCHI0db';

const heroPayers = [
  { name: 'Aetna', domain: 'aetna.com' },
  { name: 'Blue Cross Blue Shield', domain: 'bcbs.com' },
  { name: 'Cigna', domain: 'cigna.com' },
  { name: 'UnitedHealthcare', domain: 'uhc.com' },
  { name: 'Humana', domain: 'humana.com' },
  { name: 'TRICARE', domain: 'tricare.mil' },
];

function HeroPayerLogo({ name, domain }: { name: string; domain: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        className="text-white/70 text-[13px] font-semibold tracking-wide whitespace-nowrap"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {name}
      </span>
    );
  }
  return (
    <img
      src={`https://cdn.brandfetch.io/${domain}/fallback/404/theme/dark/h/80/w/200/logo?c=${BRANDFETCH_CLIENT_ID}`}
      alt={name}
      className="h-6 lg:h-7 w-auto max-w-[120px] object-contain opacity-90"
      loading="eager"
      onError={() => setFailed(true)}
    />
  );
}

/* ── Media Sources ───────────────────────────────────────────────── */

interface HeroSource {
  src: string;
  label: string;
  alt: string;
}

// Landing page hero — horizontally scrolling images instead of
// cross-fading videos. object-cover on portrait mobile was cropping
// into an unusable close-up; a scroll-snap band gives each image its
// own panel, visitors swipe naturally, and auto-advance keeps the
// section alive on desktop.
const heroSources: HeroSource[] = [
  { src: '/images/facility-exterior-mountains.jpg',    label: 'The Ranch',         alt: 'Seven Arrows facility at the base of the Swisshelm Mountains' },
  { src: '/images/horses-grazing.jpg',                  label: 'Equine Program',    alt: 'Horses grazing on the ranch' },
  { src: '/images/covered-porch-desert-view.jpg',       label: 'Covered Porch',     alt: 'Covered porch with desert view' },
  { src: '/images/group-sunset-desert.jpg',             label: 'Community',         alt: 'Group gathering in the desert at sunset' },
  { src: '/images/common-area-living-room.jpg',         label: 'Residences',        alt: 'Common area living room' },
  { src: '/images/group-gathering-pavilion.jpg',        label: 'Gathering Space',   alt: 'Group gathering in the pavilion' },
];

/* ── Ticker Items ──────────────────────────────────────────────────── */

const tickerItems = [
  { type: 'stat', text: '★ 4.9/5 Google Rating' },
  { type: 'divider' },
  { type: 'stat', text: '6:1 Client to Staff Ratio' },
  { type: 'divider' },
  { type: 'link', text: 'Read: When Drinking Stops Working →', href: '/who-we-are/blog/when-drinking-stops-working' },
  { type: 'divider' },
  { type: 'stat', text: '90+ Day Programs' },
  { type: 'divider' },
  { type: 'review', text: '"We finally have our son back." — Sarah K.' },
  { type: 'divider' },
  { type: 'stat', text: '24/7 Admissions' },
  { type: 'divider' },
  { type: 'review', text: '"This place is different." — James R.' },
  { type: 'divider' },
  { type: 'stat', text: 'JCAHO Accredited • LegitScript Certified' },
  { type: 'divider' },
];

function TickerContent() {
  return (
    <>
      {tickerItems.map((item, i) => {
        if (item.type === 'divider') {
          return <span key={i} className="text-white/20 mx-4">|</span>;
        }
        if (item.type === 'stat') {
          return (
            <span key={i} className="whitespace-nowrap text-white/90 text-[11px] font-semibold tracking-wider uppercase" style={{ fontFamily: 'var(--font-body)' }}>
              {item.text}
            </span>
          );
        }
        if (item.type === 'review') {
          return (
            <span key={i} className="whitespace-nowrap text-white/60 text-[11px] italic" style={{ fontFamily: 'var(--font-body)' }}>
              {item.text}
            </span>
          );
        }
        if (item.type === 'link' && item.href) {
          return (
            <Link
              key={i}
              href={item.href}
              className="whitespace-nowrap text-accent text-[11px] font-semibold hover:text-white transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {item.text}
            </Link>
          );
        }
        return null;
      })}
    </>
  );
}

/* ── Hero Component ────────────────────────────────────────────────── */

export default function Hero() {
  const [visible, setVisible] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto-advance: scroll the horizontal track one viewport-width every
  // 7 seconds. Loops back to the first slide after the last. Pauses
  // while the user is interacting with the scroller (touch / drag).
  const startAutoPlay = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % heroSources.length;
        const el = scrollRef.current;
        if (el) el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
        return next;
      });
    }, 7000);
  }, []);

  const stopAutoPlay = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    startAutoPlay();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startAutoPlay]);

  // Track active slide from user scroll so the dots + auto-advance
  // stay in sync when the user manually swipes.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let frame: number | null = null;
    const onScroll = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        if (!el.clientWidth) return;
        const idx = Math.round(el.scrollLeft / el.clientWidth);
        setActiveSlide((prev) => (prev === idx ? prev : idx));
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section
      className="relative flex flex-col overflow-hidden"
      aria-labelledby="hero-heading"
      // Pull the hero up by the sticky header's height so the video
      // extends behind the transparent nav — without this the region
      // between the orange TopBar and the hero renders white.
      style={{ marginTop: 'calc(var(--site-header-height, 68px) * -1)' }}
    >
      {/* Full-viewport image backdrop with text overlay. On mobile we use
          svh (small viewport height) so mobile browser chrome collapsing
          doesn't leave a white gap under the hero. */}
      {/* Height tiers match what landscape images can render without
          absurd object-cover cropping. A full-svh portrait slot cropped
          a 16:9 photo down to ~30% of its width and produced the
          blurry-fur close-ups, so on mobile we honor an aspect ratio
          (slightly taller than square) instead — that shows roughly
          half of each landscape image and leaves enough room for the
          overlay copy. sm+ returns to the full viewport hero. */}
      <div className="relative w-full aspect-[5/6] sm:aspect-auto sm:min-h-[calc(100svh-40px-44px)] lg:min-h-[calc(100vh-40px-44px)] overflow-hidden bg-dark-section">
        {/* Horizontal scroll-snap band. Each slide fills the viewport,
            snap-center keeps the active slide aligned, scrollbar is
            hidden via Tailwind's 'hide-scrollbar' utility (or inline
            scrollbarWidth:none for browsers that support it). Auto-
            advance is driven by setActiveSlide → scrollTo() in the
            effect above; manual swipe updates activeSlide via scroll
            listener so everything stays in sync. */}
        <div
          ref={scrollRef}
          className="absolute inset-0 z-0 flex overflow-x-auto snap-x snap-mandatory scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onPointerDown={stopAutoPlay}
          onTouchStart={stopAutoPlay}
        >
          {heroSources.map((src, i) => (
            <div key={i} className="relative w-full h-full flex-shrink-0 snap-center" aria-hidden={i !== activeSlide}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src.src}
                alt={src.alt}
                className="absolute inset-0 w-full h-full object-cover"
                // object-position biased below center so portrait
                // mobile crops of these landscape photos show the
                // subject (building, horses, group) instead of a
                // ceiling of sky. 30% (sky-biased) rendered as an
                // almost-blank blue portrait on mobile.
                style={{ objectPosition: 'center 70%' }}
                loading={i === 0 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : 'auto'}
              />
            </div>
          ))}
        </div>

        {/* Uniform color wash — recovery.com uses a deep navy tint
            across the whole image so the hero reads as a single mood
            rather than a photo + text panel. We use a warm terracotta-
            shadow mix so it stays on-brand while achieving the same
            effect. Slight vertical fade keeps the bottom deeper for
            the video label + dots. */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              'linear-gradient(180deg, rgba(36,16,10,0.55) 0%, rgba(36,16,10,0.45) 55%, rgba(36,16,10,0.7) 100%)',
          }}
        />

        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full h-full">
          <div className="h-full sm:min-h-[calc(100svh-40px-44px)] lg:min-h-[calc(100vh-40px-44px)] flex items-center justify-center">
            {/* Pad down by the header so the headline clears the nav
                even though the hero now extends up behind it. */}
            <div
              className="max-w-3xl w-full text-center text-white py-10 sm:py-16 lg:py-20"
              style={{ paddingTop: 'calc(var(--site-header-height, 68px) + 1.5rem)' }}
            >
              <h1
                id="hero-heading"
                className="font-bold leading-[1.02] tracking-tight mb-6"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(30px)',
                  transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
                }}
              >
                A place to <em className="not-italic font-bold" style={{ color: 'var(--color-accent)' }}>land</em>.
              </h1>

              <p
                className="mx-auto max-w-xl text-white/85 leading-relaxed mb-8 text-base sm:text-lg"
                style={{
                  fontFamily: 'var(--font-body)',
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.35s',
                }}
              >
                Seven Arrows Recovery is a residential addiction treatment
                ranch at the base of the Swisshelm Mountains in Arizona.
              </p>

              {/* Primary CTA — replacing the directory-style search input
                  from Recovery.com with an honest, single-purpose button.
                  A facility website only has one job here: move the visitor
                  into insurance verification / admissions. */}
              <div
                className="mx-auto w-full max-w-xl flex flex-col sm:flex-row items-center justify-center gap-3"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.45s',
                }}
              >
                <Link
                  href="/admissions#verify"
                  className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-full px-8 py-4 text-base font-semibold shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] transition-all"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                  Verify My Insurance
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>
              </div>

              {/* Payer trust strip — shows the visitor at a glance that we
                  accept their plan, which is exactly the reassurance the
                  removed search field was gesturing at. Hidden on mobile
                  so the hero stays focused on headline + primary CTA. */}
              <div
                className="mt-8 mx-auto max-w-3xl hidden lg:block"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.55s',
                }}
              >
                <p
                  className="text-white/55 text-[11px] tracking-[0.22em] uppercase mb-4"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  In-Network &amp; Out-of-Network
                </p>
                <div className="flex flex-wrap justify-center items-center gap-x-6 sm:gap-x-8 lg:gap-x-10 gap-y-4">
                  {heroPayers.map((p) => (
                    <HeroPayerLogo key={p.name} name={p.name} domain={p.domain} />
                  ))}
                </div>
              </div>

              <div
                className="mt-7 hidden lg:flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 text-sm text-white/85"
                style={{
                  fontFamily: 'var(--font-body)',
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.6s',
                }}
              >
                <Link
                  href="/admissions"
                  className="hover:text-white font-semibold transition-colors"
                >
                  Start Admissions →
                </Link>
                <span className="hidden sm:inline text-white/30">·</span>
                <a
                  href="tel:+18669964308"
                  className="hover:text-white font-semibold transition-colors inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                  </svg>
                  Call (866) 996-4308
                </a>
              </div>

              <p
                className="mt-10 text-white/55 text-[11px] tracking-[0.22em] uppercase hidden lg:block"
                style={{
                  fontFamily: 'var(--font-body)',
                  opacity: visible ? 1 : 0,
                  transition: 'opacity 0.8s ease 0.9s',
                }}
              >
                JCAHO Accredited &bull; LegitScript Certified &bull; HIPAA Compliant
              </p>
            </div>
          </div>
        </div>

        {/* Slide dots */}
        {heroSources.length > 1 && (
          <div className="absolute bottom-6 right-6 z-30 flex gap-2">
            {heroSources.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeSlide ? 'w-8 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Horizontal scrolling ticker */}
      <div
        className="relative z-20 bg-dark-section overflow-hidden"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.8s ease 1.2s',
        }}
      >
        <div className="py-3 flex items-center">
          <div className="flex animate-ticker">
            <div className="flex items-center shrink-0">
              <TickerContent />
            </div>
            <div className="flex items-center shrink-0">
              <TickerContent />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
