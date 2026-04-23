'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PublicTeamMember } from '@/lib/team';
import SevenArrowsMark from './SevenArrowsMark';
import { EASE_OUT_QUART, useReducedMotion } from './motion';

/**
 * Editorial hero for an individual team-member profile page. A dark
 * copper-to-brown gradient slab, with:
 *
 *  - a slow-rotating Seven Arrows watermark pinned behind the right
 *    side of the viewport as atmospheric brand texture,
 *  - the portrait in a large rounded frame whose accent ring draws
 *    itself in on mount,
 *  - the name as a staggered word-by-word reveal in the display serif,
 *  - eyebrow / job title / CTAs that fade in after the name has landed.
 *
 * All motion is disabled under prefers-reduced-motion; the final
 * resting pose is rendered immediately instead.
 */
export default function TeamMemberHero({ member }: { member: PublicTeamMember }) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Small RAF delay so initial paint is the "before" state and the
    // browser has a chance to commit it before the transition flips.
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const show = mounted || reduced;
  const nameWords = member.full_name.trim().split(/\s+/);

  return (
    <section
      className="relative overflow-hidden text-white"
      aria-labelledby="team-member-heading"
      style={{
        marginTop: 'calc(var(--site-header-height, 68px) * -1)',
        background:
          'linear-gradient(150deg, var(--color-dark-section) 0%, var(--color-primary-dark) 60%, var(--color-primary) 100%)',
      }}
    >
      {/* Warm radial atmosphere. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 55% at 20% 30%, rgba(216,137,102,0.28) 0%, rgba(216,137,102,0) 60%), radial-gradient(ellipse 50% 50% at 85% 75%, rgba(107,42,20,0.35) 0%, rgba(107,42,20,0) 55%)',
        }}
      />

      {/* Ambient Seven Arrows mark — pinned far right, slow rotation,
          cropped by overflow. Adds quiet brand presence without
          competing with the portrait or type. */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none hidden md:block"
        style={{
          right: '-120px',
          top: '12%',
          opacity: show ? 0.16 : 0,
          transform: show ? 'scale(1)' : 'scale(0.92)',
          transformOrigin: 'center',
          transition: `opacity 1.6s ${EASE_OUT_QUART} 0.3s, transform 1.6s ${EASE_OUT_QUART} 0.3s`,
          animation: reduced ? undefined : 'sa-hero-spin 80s linear infinite',
        }}
      >
        <style>{`@keyframes sa-hero-spin { from { rotate: 0deg } to { rotate: 360deg } }`}</style>
        <SevenArrowsMark size={540} animated={false} tone="white" />
      </div>

      <div
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        style={{ paddingTop: 'calc(var(--site-header-height, 68px) + 3rem)' }}
      >
        <div className="min-h-[75vh] lg:min-h-[82vh] pb-16 lg:pb-24 grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Portrait */}
          <div
            className="lg:col-span-5 order-1 lg:order-1"
            style={{
              opacity: show ? 1 : 0,
              transform: show ? 'translateY(0)' : 'translateY(18px)',
              transition: `all 1s ${EASE_OUT_QUART} 0.15s`,
            }}
          >
            <div className="relative w-full max-w-[520px] mx-auto">
              {/* Accent ring offset behind — animates in with a
                  delayed slide so it arrives after the portrait. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-[32px] bg-accent/35"
                style={{
                  transform: show ? 'translate(12px, 12px)' : 'translate(0, 0)',
                  opacity: show ? 1 : 0,
                  transition: `all 1.1s ${EASE_OUT_QUART} 0.55s`,
                }}
              />
              {/* Stroked outline that draws itself around the frame
                  as the portrait settles — little hint of the
                  medallion's stroke-draw without repeating the mark. */}
              <svg
                aria-hidden="true"
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 100 125"
                preserveAspectRatio="none"
                style={{ overflow: 'visible' }}
              >
                <rect
                  x="0.5"
                  y="0.5"
                  width="99"
                  height="124"
                  rx="8"
                  ry="8"
                  fill="none"
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="0.3"
                  pathLength={1}
                  strokeDasharray="1"
                  strokeDashoffset={show ? 0 : 1}
                  style={{ transition: `stroke-dashoffset 1.6s ${EASE_OUT_QUART} 0.8s` }}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div
                className="relative rounded-[32px] overflow-hidden bg-white/5 aspect-[4/5] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] ring-1 ring-white/10"
                style={{ viewTransitionName: `member-avatar-${member.slug}` }}
              >
                {member.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.avatar_url}
                    alt={member.full_name}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="eager"
                    style={{
                      transform: show ? 'scale(1)' : 'scale(1.06)',
                      transition: `transform 1.4s ${EASE_OUT_QUART} 0.15s`,
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white/25 text-9xl font-bold">
                    {member.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Title block */}
          <div className="lg:col-span-7 order-2 lg:order-2">
            <nav
              aria-label="Breadcrumb"
              className="mb-7 text-[11px] tracking-[0.18em] uppercase font-semibold text-white/70"
              style={{
                fontFamily: 'var(--font-body)',
                opacity: show ? 1 : 0,
                transform: show ? 'translateY(0)' : 'translateY(10px)',
                transition: `all 0.9s ${EASE_OUT_QUART} 0.1s`,
              }}
            >
              <ol className="flex items-center gap-2 flex-wrap">
                <li>
                  <Link href="/" className="hover:text-white transition-colors" style={{ color: 'var(--color-accent)' }}>Home</Link>
                </li>
                <li className="text-white/40">/</li>
                <li>
                  <Link href="/who-we-are" className="hover:text-white transition-colors" style={{ color: 'var(--color-accent)' }}>Who We Are</Link>
                </li>
                <li className="text-white/40">/</li>
                <li>
                  <Link href="/who-we-are/meet-our-team" className="hover:text-white transition-colors" style={{ color: 'var(--color-accent)' }}>Meet Our Team</Link>
                </li>
                <li className="text-white/40">/</li>
                <li className="text-white/85">{member.full_name}</li>
              </ol>
            </nav>

            <p
              className="flex items-center gap-4 text-[11px] tracking-[0.24em] uppercase font-semibold text-accent mb-5"
              style={{
                fontFamily: 'var(--font-body)',
                opacity: show ? 1 : 0,
                transform: show ? 'translateY(0)' : 'translateY(8px)',
                transition: `all 0.8s ${EASE_OUT_QUART} 0.25s`,
              }}
            >
              <span
                className="block h-px bg-white/70"
                aria-hidden="true"
                style={{
                  width: show ? '2.5rem' : '0rem',
                  transition: `width 0.9s ${EASE_OUT_QUART} 0.35s`,
                }}
              />
              Our Team
            </p>

            {/* Name — staggered word-by-word reveal. Each word slides
                up into place from below the display-font's cap line,
                masked by an overflow-hidden wrapper. */}
            <h1
              id="team-member-heading"
              className="font-bold tracking-tight leading-[1.02] mb-5"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.6rem, 6vw, 5.2rem)',
              }}
            >
              {nameWords.map((word, i) => (
                <span
                  key={i}
                  className="inline-block overflow-hidden align-bottom"
                  style={{ lineHeight: 1 }}
                >
                  <span
                    className="inline-block"
                    style={{
                      transform: show ? 'translateY(0)' : 'translateY(110%)',
                      transition: `transform 1s ${EASE_OUT_QUART} ${0.4 + i * 0.08}s`,
                    }}
                  >
                    {word}
                    {i < nameWords.length - 1 ? ' ' : ''}
                  </span>
                </span>
              ))}
            </h1>

            {member.job_title && (
              <p
                className="text-white/85 text-lg lg:text-xl font-semibold tracking-wide max-w-lg"
                style={{
                  fontFamily: 'var(--font-body)',
                  opacity: show ? 1 : 0,
                  transform: show ? 'translateY(0)' : 'translateY(10px)',
                  transition: `all 0.9s ${EASE_OUT_QUART} ${0.55 + nameWords.length * 0.08}s`,
                }}
              >
                {member.job_title}
              </p>
            )}

            <div
              className="mt-10 flex flex-col sm:flex-row gap-4"
              style={{
                opacity: show ? 1 : 0,
                transform: show ? 'translateY(0)' : 'translateY(12px)',
                transition: `all 1s ${EASE_OUT_QUART} ${0.7 + nameWords.length * 0.08}s`,
              }}
            >
              <a
                href="tel:+18669964308"
                className="inline-flex items-center gap-2 bg-white text-primary-dark hover:bg-warm-bg rounded-full px-7 py-3.5 text-sm font-semibold shadow-[0_18px_40px_-18px_rgba(0,0,0,0.7)] transition-all"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Call (866) 996-4308
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 border border-white/35 hover:border-white text-white hover:bg-white/10 rounded-full px-7 py-3.5 text-sm font-semibold transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Contact Seven Arrows
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
