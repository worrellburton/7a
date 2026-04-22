'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const tickerItems = [
  { type: 'stat', text: '4.9/5 Google Rating' },
  { type: 'review', text: '"Seven Arrows saved my life." — Michael T.' },
  { type: 'stat', text: '6:1 Client to Staff Ratio' },
  { type: 'link', text: 'NEW: When Drinking Stops Working →', href: '/who-we-are/blog/when-drinking-stops-working' },
  { type: 'stat', text: '90+ Day Programs Available' },
  { type: 'review', text: '"We finally have our son back." — Sarah K.' },
  { type: 'stat', text: '24/7 Admissions Support' },
  { type: 'review', text: '"This place is different." — James R.' },
  { type: 'stat', text: 'JCAHO Accredited • LegitScript Certified' },
];

function TickerContent() {
  return (
    <>
      {tickerItems.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-3 mx-6 whitespace-nowrap">
          {item.type === 'stat' && (
            <span
              className="text-accent font-semibold text-xs tracking-wider uppercase"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {item.text}
            </span>
          )}
          {item.type === 'review' && (
            <span className="text-white/80 text-xs italic" style={{ fontFamily: 'var(--font-body)' }}>
              {item.text}
            </span>
          )}
          {item.type === 'link' && item.href && (
            <Link
              href={item.href}
              className="text-white text-xs font-semibold hover:text-accent transition-colors underline decoration-accent/50"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {item.text}
            </Link>
          )}
          <span className="text-white/20">•</span>
        </span>
      ))}
    </>
  );
}

/**
 * BottomTicker — sticky at the bottom of the viewport once the user
 * has scrolled past the first viewport height. Tucks back out of view
 * near the footer so it doesn't stack on top of the contact form +
 * accreditation strip. Desktop-only (mobile viewports are already
 * tight and the sticky CTA pill lives in that slot instead).
 */
export default function BottomTicker() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const viewport = window.innerHeight;
      const docEnd = document.documentElement.scrollHeight - viewport;

      // Show after the user is past the first screen's worth of content.
      const pastHero = y > viewport * 0.6;

      // Hide in the final stretch so the ticker doesn't overlap the
      // footer's contact form and accreditation row.
      const nearFooter = y > docEnd - 640;

      setVisible(pastHero && !nearFooter);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className="hidden lg:block fixed inset-x-0 bottom-0 z-40 bg-dark-section/95 border-t border-white/10 overflow-hidden pointer-events-auto"
      style={{
        backdropFilter: 'blur(10px) saturate(140%)',
        WebkitBackdropFilter: 'blur(10px) saturate(140%)',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.45s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease',
      }}
    >
      <div className="py-3 flex animate-ticker" style={{ width: 'max-content' }}>
        <div className="flex items-center shrink-0">
          <TickerContent />
        </div>
        <div className="flex items-center shrink-0">
          <TickerContent />
        </div>
      </div>
    </div>
  );
}
