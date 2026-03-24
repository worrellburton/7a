import { Link } from '@remix-run/react';
import { useEffect, useState } from 'react';

/* ── Ticker Items ──────────────────────────────────────────────────── */

const tickerItems = [
  { type: 'stat', text: '★ 4.9/5 Google Rating' },
  { type: 'divider' },
  { type: 'review', text: '"Seven Arrows saved my life." — Michael T.' },
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
  { type: 'link', text: 'Read: Your First Week in Treatment →', href: '/who-we-are/blog/what-happens-when-you-walk-through-the-door' },
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

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      className="relative flex flex-col overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Main hero area */}
      <div className="relative min-h-[480px] lg:min-h-[calc(100vh-68px-40px-44px)] flex items-center">
        {/* Background image with subtle zoom */}
        <div className="absolute inset-0 z-0">
          <img
            src="/7a/images/facility-exterior-mountains.jpg"
            alt="Seven Arrows Recovery facility with Swisshelm Mountains"
            className="w-full h-full object-cover transition-transform duration-[8000ms] ease-out"
            style={{ transform: visible ? 'scale(1.05)' : 'scale(1)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2a0f0a]/60 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="max-w-xl">
            {/* Label */}
            <div
              className="mb-5"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(20px)',
                transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
              }}
            >
              <p className="section-label text-[10px]">Drug Rehab in Arizona</p>
            </div>

            {/* Heading */}
            <h1
              id="hero-heading"
              className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-foreground leading-[1.1] mb-5"
            >
              <span
                className="inline-block"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(40px)',
                  transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.4s',
                }}
              >
                A Place
              </span>{' '}
              <span
                className="inline-block"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(40px)',
                  transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.55s',
                }}
              >
                to
              </span>{' '}
              <span
                className="inline-block"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(40px)',
                  transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.7s',
                }}
              >
                Heal.
              </span>
            </h1>

            {/* Description */}
            <p
              className="text-sm text-foreground/70 leading-relaxed mb-7 max-w-md"
              style={{
                fontFamily: 'var(--font-body)',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(30px)',
                transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.9s',
              }}
            >
              Find out why Seven Arrows Recovery is considered one of the best drug
              rehabs in Arizona. We provide clinical and residential treatment to ensure
              lasting recovery in a small group setting, nestled at the base of the tranquil
              Swisshelm mountains.
            </p>

            {/* CTA */}
            <div
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(30px)',
                transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 1.1s',
              }}
            >
              <Link href="/admissions" className="btn-primary text-sm">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal scrolling ticker — pinned at bottom of hero */}
      <div
        className="relative z-20 bg-dark-section overflow-hidden"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.8s ease 1.4s',
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
