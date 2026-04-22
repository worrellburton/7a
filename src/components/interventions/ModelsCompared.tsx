'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Interventions — Phase 6. "Models compared."
 *
 * Honest side-by-side of the three most common intervention models
 * (Johnson, ARISE, Systemic) next to our hybrid. Each column lists
 * stance on confrontation, length of prep, family involvement, and
 * the typical failure mode. Builds trust by being specific rather
 * than dismissive of other approaches.
 */

type Column = {
  name: string;
  tagline: string;
  confrontation: string;
  prepLength: string;
  familyRole: string;
  mostLikelyToFailWhen: string;
  highlight: boolean;
};

const cols: Column[] = [
  {
    name: 'Johnson Model',
    tagline: '1960s-era surprise confrontation.',
    confrontation: 'High — your loved one is brought into the room unaware.',
    prepLength: '2–5 prep sessions, then a single confrontation event.',
    familyRole: 'Collective surprise, each member reads a prepared letter.',
    mostLikelyToFailWhen:
      'Your loved one is already suspicious, has previously refused treatment, or the family unity is fragile.',
    highlight: false,
  },
  {
    name: 'ARISE Invitational',
    tagline: 'Gradual, fully-disclosed invitation.',
    confrontation: 'Low — your loved one is told about the process from the start.',
    prepLength: 'Multiple open meetings over weeks, sometimes months.',
    familyRole: 'Repeated engagement, with the identified person optional but invited each time.',
    mostLikelyToFailWhen:
      'The situation is time-sensitive (medical risk, legal, safety) and you cannot afford weeks of prep.',
    highlight: false,
  },
  {
    name: 'Systemic / Family Systems',
    tagline: 'Treats the family, not just the identified patient.',
    confrontation: 'Very low — no single "intervention event"; continuous family therapy.',
    prepLength: 'Ongoing — typically weeks to months of weekly family sessions.',
    familyRole: 'Every member is a patient; the identified person joins when ready.',
    mostLikelyToFailWhen:
      'The identified person needs to be in residential care now, not in twelve weeks.',
    highlight: false,
  },
  {
    name: 'The Seven Arrows Hybrid',
    tagline: 'ARISE transparency, Johnson structure, Systemic follow-through.',
    confrontation:
      'Medium — disclosed, not ambushed, but with a structured day-of event that holds the line.',
    prepLength: '3–7 days of prep when possible; 24-hour rapid deploy when it can\'t wait.',
    familyRole:
      'Everyone in the room is trained, rehearsed, and given a specific role. Nobody walks in cold.',
    mostLikelyToFailWhen:
      'Nearly never, and when it does, we leave the family with a 30/60/90-day follow-on plan so the work continues.',
    highlight: true,
  },
];

export default function ModelsCompared() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es)
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32 bg-warm-bg relative overflow-hidden"
      aria-labelledby="models-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-20"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">Models Compared</p>
          <h2
            id="models-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.05,
            }}
          >
            Not every intervention is the{' '}
            <em className="not-italic text-primary">same intervention.</em>
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Three well-known models each work — in the right hands, in
            the right family, with the right timing. We borrow what
            works from each and discard what doesn&rsquo;t.
          </p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
          {cols.map((c, i) => (
            <article
              key={c.name}
              className={`relative rounded-2xl p-6 lg:p-7 border transition-all ${
                c.highlight
                  ? 'bg-dark-section text-white border-primary shadow-xl'
                  : 'bg-white border-black/5'
              }`}
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(20px)',
                transition: `all 0.95s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.1}s`,
              }}
            >
              {c.highlight && (
                <span
                  className="absolute -top-3 left-6 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent text-foreground text-[10px] font-bold tracking-[0.18em] uppercase shadow-md"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Our model
                </span>
              )}
              <h3
                className={`font-bold mb-1 ${c.highlight ? 'text-white' : 'text-foreground'}`}
                style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', lineHeight: 1.15 }}
              >
                {c.name}
              </h3>
              <p
                className={`text-[13px] italic mb-5 ${c.highlight ? 'text-accent' : 'text-primary'}`}
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {c.tagline}
              </p>

              <dl className="space-y-3.5 text-[13.5px] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                <Row highlight={c.highlight} label="Confrontation" value={c.confrontation} />
                <Row highlight={c.highlight} label="Prep length" value={c.prepLength} />
                <Row highlight={c.highlight} label="Family role" value={c.familyRole} />
                <Row highlight={c.highlight} label="Fails when" value={c.mostLikelyToFailWhen} />
              </dl>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Row({
  highlight,
  label,
  value,
}: {
  highlight: boolean;
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt
        className={`text-[10px] tracking-[0.22em] uppercase font-semibold mb-0.5 ${
          highlight ? 'text-white/55' : 'text-foreground/40'
        }`}
      >
        {label}
      </dt>
      <dd className={highlight ? 'text-white/90' : 'text-foreground/75'}>{value}</dd>
    </div>
  );
}
