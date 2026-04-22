'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Holistic & Indigenous — Phase 5. Indigenous practices feature.
 *
 * A reverent counterweight to the eight-tile modalities bento above.
 * Full-bleed image panel on the left (campfire ceremony circle),
 * editorial list of four indigenous practices on the right — sweat
 * lodge, smudging, talking circle, land-based ceremony. Each gets a
 * small role-tag, a serif title, and a sourced-feeling body copy.
 * Practices are named as what they are (ceremony, medicine), not
 * sanitized into spa language.
 */

interface Practice {
  tag: string;
  title: string;
  body: string;
}

const practices: Practice[] = [
  {
    tag: 'Ceremony',
    title: 'Sweat lodge',
    body:
      'Inipi. A structured purification held by trusted carriers, on the land. Heat, water, prayer, and song — a container old enough that the body knows what to do inside it.',
  },
  {
    tag: 'Medicine',
    title: 'Smudging',
    body:
      'Sage, cedar, sweetgrass. A practice of clearing and intention that bookends difficult clinical work and marks transitions through the day.',
  },
  {
    tag: 'Voice',
    title: 'Talking circle',
    body:
      'One voice at a time, talking stick in hand. No cross-talk, no fixing. A format that teaches listening as a physical skill, not a concept.',
  },
  {
    tag: 'Place',
    title: 'Land-based ceremony',
    body:
      'Sunrise, fire, sky. Practices that place recovery inside the landscape itself — the Sonoran desert as a teacher, not a backdrop.',
  },
];

export default function IndigenousFeature() {
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
      className="relative bg-warm-bg"
      aria-labelledby="indigenous-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Image panel */}
          <div
            className="lg:col-span-6 order-1"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(22px)',
              transition: 'all 1.05s cubic-bezier(0.16,1,0.3,1) 0.15s',
            }}
          >
            <figure className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-dark-section shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/campfire-ceremony-circle.webp"
                alt="Evening ceremony circle at Seven Arrows"
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(20,10,6,0) 45%, rgba(20,10,6,0.55) 80%, rgba(20,10,6,0.92) 100%)',
                }}
              />
              <figcaption
                className="absolute inset-x-6 bottom-6 text-white/90 text-[12px] tracking-[0.18em] uppercase font-semibold"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Ceremony circle · dusk
              </figcaption>
            </figure>
          </div>

          {/* Copy panel */}
          <div className="lg:col-span-6 order-2">
            <p
              className="section-label mb-5"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(10px)',
                transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s',
              }}
            >
              Indigenous practice
            </p>
            <h2
              id="indigenous-heading"
              className="text-foreground font-bold tracking-tight mb-6"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 4.2vw, 3rem)',
                lineHeight: 1.04,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(14px)',
                transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.2s',
              }}
            >
              Held by <em className="not-italic text-primary">carriers</em>, not borrowed.
            </h2>
            <p
              className="text-foreground/75 text-lg leading-relaxed mb-10 max-w-xl"
              style={{
                fontFamily: 'var(--font-body)',
                opacity: visible ? 1 : 0,
                transition: 'opacity 0.9s ease 0.35s',
              }}
            >
              These practices aren&rsquo;t a menu item. They&rsquo;re held by
              trusted carriers with permission and lineage, offered with context,
              and never required. Clients opt in when and how it feels right.
            </p>

            <ol className="space-y-7 relative">
              <span
                aria-hidden="true"
                className="absolute left-[7px] top-2 bottom-2 w-px bg-primary/25"
              />
              {practices.map((p, i) => (
                <li
                  key={p.title}
                  className="relative pl-8"
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(14px)',
                    transition: `all 0.85s cubic-bezier(0.16,1,0.3,1) ${0.4 + i * 0.12}s`,
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-warm-bg border-2 border-primary"
                  />
                  <p
                    className="text-[10px] font-semibold tracking-[0.24em] uppercase text-primary mb-1.5"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {p.tag}
                  </p>
                  <h3
                    className="text-foreground font-bold mb-2"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.35rem',
                      lineHeight: 1.1,
                    }}
                  >
                    {p.title}
                  </h3>
                  <p
                    className="text-foreground/70 leading-relaxed"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {p.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
