'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Phase 11 — Homepage orientation block.
 *
 * Sits between the stats row and the program-introduction so the
 * visitor answers three questions above the first fold scroll:
 * "what is this?", "where is this?", and "is it credible?".
 * The "drug rehab in Arizona" phrasing is intentional SEO copy —
 * the page's primary head term was missing from any heading above H3.
 */
export default function PlaceToHeal() {
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
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative py-20 lg:py-28 bg-white overflow-hidden"
      aria-labelledby="place-to-heal-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 60% at 82% 30%, rgba(216,137,102,0.09) 0%, rgba(216,137,102,0) 65%)',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div
            className="lg:col-span-7"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(14px)',
              transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
            }}
          >
            <p className="section-label mb-5">Drug Rehab in Arizona</p>
            <h2
              id="place-to-heal-heading"
              className="text-foreground font-bold tracking-tight mb-6"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.25rem, 4.4vw, 3.6rem)',
                lineHeight: 1.02,
              }}
            >
              A place to <em className="not-italic" style={{ color: 'var(--color-accent)' }}>heal</em>.
            </h2>
            <p
              className="text-foreground/75 text-lg leading-relaxed mb-8 max-w-2xl"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Find out why Seven Arrows Recovery is considered one of the best
              drug rehabs in Arizona. We provide clinical and residential
              treatment to ensure lasting recovery in a small group setting,
              nestled at the base of the tranquil Swisshelm Mountains.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/admissions#verify" className="btn-primary">
                Verify My Insurance
              </Link>
              <Link href="/tour" className="btn-outline">
                Tour the Ranch
              </Link>
            </div>
          </div>

          <ul
            className="lg:col-span-5 grid grid-cols-2 gap-3 sm:gap-4"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(18px)',
              transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.2s',
            }}
          >
            {[
              { k: 'Location', v: 'Cochise County, Arizona' },
              { k: 'Program Length', v: '30 · 60 · 90+ days' },
              { k: 'Setting', v: 'Small-group residential' },
              { k: 'Ratio', v: '6:1 client-to-staff' },
              { k: 'Accredited', v: 'JCAHO Gold Seal' },
              { k: 'In-Network', v: 'Most major insurance' },
            ].map((row) => (
              <li
                key={row.k}
                className="rounded-xl bg-warm-bg p-4 lg:p-5 border border-black/5"
              >
                <p
                  className="text-[10px] font-semibold tracking-[0.22em] uppercase text-primary mb-1.5"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {row.k}
                </p>
                <p
                  className="text-foreground text-sm lg:text-[15px] font-semibold"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {row.v}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
