'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Why Us — "Our Promise" editorial beat.
 *
 * Large, quiet dark-section with three layered lines of serif copy
 * that fade in one after another as the section enters the viewport.
 * Intentionally typographic rather than photo-heavy so it reads as
 * a pause — a held note between the bento "difference" grid and the
 * vs-traditional comparison below.
 */

const promises = [
  'Healing happens in relationship.',
  'Growth happens with support.',
  'Freedom happens when the nervous system learns it is safe to live.',
];

export default function OurPromise() {
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
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-dark-section text-white"
      aria-labelledby="our-promise-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 55% at 30% 15%, rgba(216,137,102,0.22) 0%, rgba(216,137,102,0) 60%), radial-gradient(ellipse 45% 45% at 80% 90%, rgba(107,42,20,0.3) 0%, rgba(107,42,20,0) 60%)',
        }}
      />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-28 lg:py-40">
        <p
          className="text-[11px] font-semibold tracking-[0.28em] uppercase text-accent mb-7"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          Our Promise
        </p>

        <h2
          id="our-promise-heading"
          className="font-bold tracking-tight mb-10 max-w-3xl"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 3.8vw, 3rem)',
            lineHeight: 1.08,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.18s',
          }}
        >
          We do not treat people as <em className="not-italic" style={{ color: 'var(--color-accent)' }}>problems to be fixed</em>.
        </h2>

        <p
          className="text-white/85 leading-relaxed text-lg lg:text-xl max-w-2xl mb-4"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 1s ease 0.4s',
          }}
        >
          We see individuals as inherently resilient, capable of growth, and
          worthy of compassion. Our role is to create the conditions where
          that resilience can emerge.
        </p>

        {/* Thin divider that paints in. */}
        <div
          aria-hidden="true"
          className="h-px bg-accent/70 my-12 origin-left"
          style={{
            transform: visible ? 'scaleX(1)' : 'scaleX(0)',
            transition: 'transform 1.4s cubic-bezier(0.22,1,0.36,1) 0.55s',
            width: '4rem',
          }}
        />

        {/* Three-line stanza that fades in one line at a time. */}
        <ul className="space-y-6 lg:space-y-8">
          {promises.map((line, i) => (
            <li
              key={line}
              className="flex items-start gap-5 lg:gap-7"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(14px)',
                transition: `all 1s cubic-bezier(0.16,1,0.3,1) ${0.75 + i * 0.18}s`,
              }}
            >
              <span
                aria-hidden="true"
                className="shrink-0 mt-3 lg:mt-4 w-4 lg:w-5 h-px bg-accent"
              />
              <p
                className="text-white font-bold leading-[1.12] max-w-3xl"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.5rem, 2.5vw, 2.25rem)',
                }}
              >
                {line}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
