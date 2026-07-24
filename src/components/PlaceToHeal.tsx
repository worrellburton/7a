'use client';

import Link from 'next/link';
import { useRevealOnScroll } from '@/lib/useRevealOnScroll';

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
  const { ref, visible } = useRevealOnScroll<HTMLElement>(0.25);

  return (
    <section
      ref={ref}
      className="relative py-14 lg:py-20 bg-warm-bg overflow-hidden"
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
            <h2 className="section-label mb-5">Drug Rehab in Arizona</h2>
            <p
              id="place-to-heal-heading"
              className="text-foreground font-bold tracking-tight mb-6"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.25rem, 4.4vw, 3.6rem)',
                lineHeight: 1.02,
              }}
            >
              A place to <em className="not-italic" style={{ color: 'var(--color-accent)' }}>heal</em>.
            </p>
            <p
              className="text-foreground/75 text-lg leading-relaxed mb-8 max-w-2xl"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Seven Arrows sits in Elfrida, at the base of the Swisshelm
              Mountains in Cochise County, and that&apos;s by design. Distance
              from home, old routines, and familiar triggers is part of what
              makes residential treatment work, whether someone is coming in
              for alcohol use, opioids, or a combination of substances. Our
              setting offers open desert land, real quiet, and none of the
              noise of a city clinic. Yet we&apos;re easily reached from
              anywhere in the state, whether you&apos;re coming from{' '}
              <Link
                href="/locations/phoenix"
                className="text-primary font-semibold underline underline-offset-2 hover:text-accent"
              >
                Phoenix
              </Link>
              ,{' '}
              <Link
                href="/locations/tucson"
                className="text-primary font-semibold underline underline-offset-2 hover:text-accent"
              >
                Tucson
              </Link>
              ,{' '}
              <Link
                href="/locations/mesa"
                className="text-primary font-semibold underline underline-offset-2 hover:text-accent"
              >
                Mesa
              </Link>
              , or{' '}
              <Link
                href="/locations/scottsdale"
                className="text-primary font-semibold underline underline-offset-2 hover:text-accent"
              >
                Scottsdale
              </Link>
              . As a licensed rehab in Arizona, we serve clients from across
              the state, not just the local area. The result is a place built
              for focus, not distraction, close enough to reach, far enough to
              matter.
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
              { k: 'Setting', v: 'Small-group residential · under 20 clients' },
              { k: 'Clinical team', v: 'Highly skilled & credentialed' },
              { k: 'Accredited', v: 'JCAHO Gold Seal' },
              { k: 'Insurance', v: 'Out of network · single case agreements' },
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
