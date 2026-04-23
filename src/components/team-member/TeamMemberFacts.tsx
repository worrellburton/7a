'use client';

import type { PublicTeamMember } from '@/lib/team';
import { EASE_OUT_QUART, useInView, useReducedMotion } from './motion';

/**
 * "Interesting facts" cards — mirrors the member-authored list in
 * the /app/profile editor. Each fact is a prompt/answer pair
 * ("I'm currently obsessed with…" / "Llama farming"); we render
 * them as a grid of small editorial cards with the prompt as a
 * tracked uppercase label and the answer in the display serif.
 *
 * Renders nothing when the member has no filled-in facts, so old
 * rows without the column (or accounts that haven't written any)
 * don't leave an empty section on the page.
 */
export default function TeamMemberFacts({ member }: { member: PublicTeamMember }) {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.12 });
  const show = inView || reduced;

  const facts = member.interesting_facts.filter((f) => f.answer.trim().length > 0);
  if (facts.length === 0) return null;

  const firstName = member.full_name.split(' ')[0];

  return (
    <section ref={ref} className="py-20 lg:py-28 bg-white" aria-labelledby="facts-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <p
          id="facts-heading"
          className="section-label mb-10 lg:mb-12"
          style={{
            opacity: show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(10px)',
            transition: `all 0.8s ${EASE_OUT_QUART} 0.05s`,
          }}
        >
          A few things about {firstName}
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {facts.map((fact, i) => (
            <article
              key={`${fact.prompt}-${i}`}
              className="rounded-2xl bg-warm-bg border border-black/5 p-6 lg:p-7"
              style={{
                opacity: show ? 1 : 0,
                transform: show ? 'translateY(0)' : 'translateY(18px)',
                transition: `opacity 0.85s ${EASE_OUT_QUART} ${0.15 + i * 0.07}s, transform 0.85s ${EASE_OUT_QUART} ${0.15 + i * 0.07}s`,
              }}
            >
              <p
                className="text-[10px] font-semibold tracking-[0.22em] uppercase text-primary mb-3"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {fact.prompt.replace(/…$/, '').replace(/\.\.\.$/, '').trim()}
              </p>
              <p
                className="text-foreground leading-snug"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.1rem, 1.4vw, 1.35rem)',
                  lineHeight: 1.35,
                }}
              >
                {fact.answer}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
