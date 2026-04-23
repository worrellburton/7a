'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactElement } from 'react';

interface Channel {
  title: string;
  primary: string;
  meta: string;
  body: string;
  href: string;
  external?: boolean;
  glyph: ReactElement;
}

const s = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const channels: Channel[] = [
  {
    title: 'Call',
    primary: '(866) 996-4308',
    meta: '24/7 · compassionate admissions team member',
    body: 'The fastest path. Real person picks up. Insurance check runs in parallel while we talk.',
    href: 'tel:+18669964308',
    glyph: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}>
        <path d="M29 22v4a3 3 0 0 1-3.3 3 26.4 26.4 0 0 1-11.5-4.1 26 26 0 0 1-8-8A26.4 26.4 0 0 1 2.1 5.3 3 3 0 0 1 5.1 2h4a3 3 0 0 1 3 2.3 20 20 0 0 0 1 4c.4.9.2 2-.5 2.7L11 12.5a21.3 21.3 0 0 0 8 8l1.5-1.5a2.8 2.8 0 0 1 2.7-.5 20 20 0 0 0 4 1A3 3 0 0 1 29 22z" />
      </svg>
    ),
  },
  {
    title: 'Email',
    primary: 'admissions@sevenarrowsrecovery.com',
    meta: 'Response within 1 business day',
    body: 'Best for detailed questions or if you want something in writing first. Include a phone number if you\'d like a callback.',
    href: 'mailto:admissions@sevenarrowsrecovery.com',
    glyph: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}>
        <rect x="4" y="7" width="24" height="18" rx="2" />
        <path d="M4 9l12 9 12-9" />
      </svg>
    ),
  },
  {
    title: 'Text',
    primary: '(866) 996-4308',
    meta: 'Same number · texts answered same-day',
    body: 'Send a text if a phone call isn\'t an option in the moment. A human will respond — not a bot.',
    href: 'sms:+18669964308',
    glyph: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}>
        <path d="M27 7v14a3 3 0 0 1-3 3H13l-6 5v-5H8a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h16a3 3 0 0 1 3 3z" />
        <circle cx="11" cy="14" r="1" fill="currentColor" />
        <circle cx="16" cy="14" r="1" fill="currentColor" />
        <circle cx="21" cy="14" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: 'Form',
    primary: 'Send a note from the form below',
    meta: 'Anonymous if you prefer',
    body: 'Fill in what you\'re comfortable sharing. We\'ll follow up via whichever channel you pick.',
    href: '#form',
    glyph: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}>
        <path d="M8 4h12l6 6v18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
        <path d="M20 4v6h6" />
        <path d="M11 16h10" />
        <path d="M11 20h10" />
        <path d="M11 24h6" />
      </svg>
    ),
  },
  {
    title: 'Visit',
    primary: 'Cochise County, Arizona',
    meta: 'By appointment, scheduled with admissions',
    body: 'Full campus tours are part of most admissions journeys. Out-of-state visitors welcome — we help with travel logistics.',
    href: '/tour',
    glyph: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}>
        <path d="M16 29s-10-9-10-17a10 10 0 0 1 20 0c0 8-10 17-10 17z" />
        <circle cx="16" cy="12" r="4" />
      </svg>
    ),
  },
  {
    title: 'Start admissions',
    primary: '/admissions',
    meta: 'If you\'ve already decided',
    body: 'Insurance verification form, packing list, travel coordination, and what to expect on day one. All in one place.',
    href: '/admissions',
    glyph: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}>
        <path d="M5 16h22" />
        <polyline points="22 9 29 16 22 23" />
      </svg>
    ),
  },
];

export default function WaysToReach() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32 bg-white"
      aria-labelledby="ways-to-reach-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-18"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">Ways to reach us</p>
          <h2
            id="ways-to-reach-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Pick <em className="not-italic text-primary">whichever one</em> feels doable.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Phone is fastest. Email is fine. Text is fine. Whichever one
            feels least hard in the moment is the right one.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {channels.map((c, i) => {
            const isInternal = c.href.startsWith('/') || c.href.startsWith('#');
            const content = (
              <article
                className="group h-full relative rounded-2xl bg-warm-bg border border-black/5 p-7 lg:p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(18px)',
                  transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.08}s`,
                }}
              >
                <div
                  className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5"
                  style={{
                    background: 'linear-gradient(135deg, rgba(216,137,102,0.16) 0%, rgba(107,42,20,0.08) 100%)',
                    color: 'var(--color-primary-dark)',
                  }}
                  aria-hidden="true"
                >
                  {c.glyph}
                </div>
                <h3
                  className="text-foreground font-bold mb-1.5"
                  style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', lineHeight: 1.15 }}
                >
                  {c.title}
                </h3>
                <p
                  className="text-primary font-semibold mb-1 break-words"
                  style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem' }}
                >
                  {c.primary}
                </p>
                <p
                  className="text-foreground/55 text-[11px] tracking-[0.16em] uppercase font-semibold mb-4"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {c.meta}
                </p>
                <p
                  className="text-foreground/70 leading-relaxed text-[14.5px]"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {c.body}
                </p>
              </article>
            );
            return isInternal ? (
              <Link key={c.title} href={c.href}>
                {content}
              </Link>
            ) : (
              <a key={c.title} href={c.href}>
                {content}
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
