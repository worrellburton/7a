'use client';

import Link from 'next/link';
import type { PublicTeamMember } from '@/lib/team';
import { EASE_OUT_QUART, useInView, useReducedMotion } from './motion';

/**
 * Closing "work with us" CTA on a team-member profile page. Warm
 * copper gradient slab mirrored from the site-wide closing-CTA
 * aesthetic, with the Seven Arrows mark pinned as a subtle centered
 * flourish above the headline, its arrow chain swaying gently.
 *
 * Every element fades + slides in on scroll-into-view; nothing
 * animates pre-visibility and nothing animates at all under
 * prefers-reduced-motion.
 */
export default function TeamMemberClosingCTA({ member }: { member: PublicTeamMember }) {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLElement>({ threshold: 0.12 });
  const show = inView || reduced;

  const firstName = member.full_name.split(' ')[0];

  return (
    <section
      ref={ref}
      className="relative overflow-hidden text-white"
      style={{
        background: 'linear-gradient(150deg, var(--color-dark-section) 0%, var(--color-primary-dark) 60%, var(--color-primary) 100%)',
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 0%, rgba(216,137,102,0.25) 0%, rgba(216,137,102,0) 65%)' }}
      />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 text-center">
        <p
          className="text-[11px] font-semibold tracking-[0.28em] uppercase text-accent mb-6"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(10px)',
            transition: `all 0.8s ${EASE_OUT_QUART} 0.25s`,
          }}
        >
          Work with {firstName}
        </p>

        <h2
          className="font-bold tracking-tight mb-6 mx-auto max-w-3xl"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 4.2vw, 3.2rem)',
            lineHeight: 1.05,
            opacity: show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(14px)',
            transition: `all 0.95s ${EASE_OUT_QUART} 0.35s`,
          }}
        >
          Ready to begin your recovery?
        </h2>

        <p
          className="text-white/85 text-lg leading-relaxed max-w-xl mx-auto mb-10"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(12px)',
            transition: `all 0.95s ${EASE_OUT_QUART} 0.45s`,
          }}
        >
          Our admissions team will walk you through intake and insurance
          verification, often within 24 to 48 hours.
        </p>

        <div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          style={{
            opacity: show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(14px)',
            transition: `all 1s ${EASE_OUT_QUART} 0.55s`,
          }}
        >
          <a
            href="tel:+18669964308"
            className="inline-flex items-center gap-2 bg-white text-primary-dark hover:bg-warm-bg rounded-full px-8 py-4 text-sm font-semibold shadow-[0_24px_50px_-20px_rgba(0,0,0,0.7)] transition-all"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Call (866) 996-4308
          </a>
          <Link
            href="/admissions#verify"
            className="inline-flex items-center gap-2 border border-white/35 hover:border-white text-white hover:bg-white/10 rounded-full px-8 py-4 text-sm font-semibold transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Verify Insurance
          </Link>
        </div>
      </div>
    </section>
  );
}
