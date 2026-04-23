'use client';

import type { PublicTeamMember } from '@/lib/team';
import SevenArrowsMark from './SevenArrowsMark';
import { EASE_OUT_QUART, useInView, useReducedMotion } from './motion';

/**
 * Prose bio for a team member. Renders the bio paragraph(s) on white
 * bg with a serif drop-cap on the first paragraph. DB content can
 * use double line-breaks to split paragraphs.
 *
 * Each paragraph stagger-reveals as it scrolls into view. A thin
 * copper SVG divider draws itself in above the heading to signal
 * the transition from dark hero to light editorial content.
 *
 * When there's no bio on file, a branded placeholder card hints at
 * the forthcoming write-up and offers the admissions team as a
 * way to learn more — rather than a dead empty block.
 */
export default function TeamMemberBio({ member }: { member: PublicTeamMember }) {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.15 });
  const show = inView || reduced;

  const bio = (member.bio || '').trim();
  const paragraphs = bio ? bio.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) : [];

  // Optional inline pull-quote: if the bio has 3+ paragraphs, pull
  // the first sentence of the second paragraph up into a display-
  // serif callout inserted between paragraph 1 and paragraph 2.
  const pullQuote =
    paragraphs.length >= 3 ? extractFirstSentence(paragraphs[1]) : null;

  return (
    <section ref={ref} className="relative py-20 lg:py-28 bg-white overflow-hidden" aria-labelledby="bio-heading">
      {/* Ambient brand watermark — a faint Seven Arrows medallion
          pinned to the right column, cropped by overflow. Fades in
          as the bio scrolls into view and stays very low contrast
          so it never fights with the prose. */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none hidden lg:block"
        style={{
          right: '-140px',
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: show ? 0.06 : 0,
          transition: `opacity 1.6s ${EASE_OUT_QUART} 0.4s`,
        }}
      >
        <SevenArrowsMark size={520} animated={show && !reduced} tone="warm" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Thin copper SVG divider — draws itself in as the section
            scrolls into view. Subtle transition from the dark hero. */}
        <svg
          aria-hidden="true"
          className="block mb-10"
          width="80"
          height="8"
          viewBox="0 0 80 8"
        >
          <line
            x1="0"
            y1="4"
            x2="80"
            y2="4"
            stroke="var(--color-primary)"
            strokeWidth="2"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={show ? 0 : 1}
            style={{ transition: `stroke-dashoffset 1s ${EASE_OUT_QUART}` }}
          />
        </svg>

        <p
          className="section-label mb-5"
          style={{
            opacity: show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(10px)',
            transition: `all 0.8s ${EASE_OUT_QUART} 0.05s`,
          }}
        >
          About
        </p>
        <h2
          id="bio-heading"
          className="text-foreground font-bold tracking-tight mb-10"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.9rem, 3.5vw, 2.6rem)',
            lineHeight: 1.05,
            opacity: show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(12px)',
            transition: `all 0.9s ${EASE_OUT_QUART} 0.15s`,
          }}
        >
          Get to know {member.full_name.split(' ')[0]}.
        </h2>

        {paragraphs.length > 0 ? (
          <div
            className="space-y-6 text-foreground/80 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {paragraphs.map((p, i) => {
              // Insert pull-quote between paragraph 1 and 2 when available.
              const nodes = [
                <p
                  key={`p-${i}`}
                  className={i === 0 ? 'first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-primary first-letter:leading-none first-letter:text-6xl first-letter:font-bold first-letter:pt-1' : ''}
                  style={{
                    fontFamily: 'var(--font-body)',
                    opacity: show ? 1 : 0,
                    transform: show ? 'translateY(0)' : 'translateY(14px)',
                    transition: `all 0.9s ${EASE_OUT_QUART} ${0.3 + i * 0.1}s`,
                  }}
                >
                  {p}
                </p>,
              ];
              if (i === 0 && pullQuote) {
                nodes.push(
                  <PullQuote key="pq" show={show} delay={0.5}>
                    {pullQuote}
                  </PullQuote>,
                );
              }
              return nodes;
            })}
          </div>
        ) : (
          <div
            className="rounded-2xl bg-warm-bg p-8 lg:p-10"
            style={{
              opacity: show ? 1 : 0,
              transform: show ? 'translateY(0)' : 'translateY(12px)',
              transition: `all 0.9s ${EASE_OUT_QUART} 0.3s`,
            }}
          >
            <p className="text-foreground/65 italic leading-relaxed text-lg" style={{ fontFamily: 'var(--font-display)' }}>
              {member.full_name.split(' ')[0]}&rsquo;s full bio is coming soon. In the meantime, our admissions team can tell you more about how they&rsquo;d support your recovery &mdash; call us anytime at <a href="tel:+18669964308" className="text-primary font-semibold underline decoration-primary/40 hover:decoration-primary">(866) 996-4308</a>.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Display-serif pull-quote set between bio paragraphs. Leading
 * copper bar draws in as an accent rail to the left of the quote.
 */
function PullQuote({
  children,
  show,
  delay,
}: {
  children: React.ReactNode;
  show: boolean;
  delay: number;
}) {
  return (
    <figure
      className="my-10 py-2 pl-6 relative"
      style={{
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(14px)',
        transition: `all 1s ${EASE_OUT_QUART} ${delay}s`,
      }}
    >
      <span
        aria-hidden="true"
        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-primary"
        style={{
          transformOrigin: 'top',
          transform: show ? 'scaleY(1)' : 'scaleY(0)',
          transition: `transform 1.1s ${EASE_OUT_QUART} ${delay + 0.15}s`,
        }}
      />
      <blockquote
        className="text-foreground/90 leading-[1.25]"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.3rem, 2.1vw, 1.7rem)',
        }}
      >
        &ldquo;{children}&rdquo;
      </blockquote>
    </figure>
  );
}

/**
 * Grab the first sentence from a paragraph — caps at 220 chars and
 * falls back to the full paragraph if no sentence terminator is
 * found within that window. Keeps the pull-quote tight enough to
 * land as a callout rather than a wall of text.
 */
function extractFirstSentence(paragraph: string): string {
  const trimmed = paragraph.trim();
  const match = trimmed.match(/^[^.!?]{8,220}[.!?]/);
  if (match) return match[0].replace(/\s*[.!?]$/, '').trim();
  return trimmed.length > 220 ? trimmed.slice(0, 217) + '…' : trimmed;
}
