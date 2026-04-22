'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Philosophy — Phase 7. Mind · Body · Spirit — three big photo tiles
 * with overlay text. Stagger-in on scroll, Ken-Burns-style zoom on
 * hover. Warm-bg section.
 */

const pillars = [
  {
    title: 'Mind',
    body: 'Psychoeducation, attentional practices, and cognitive reframing address thought patterns and build the awareness needed for self-regulation.',
    image: '/images/individual-therapy-session.jpg',
  },
  {
    title: 'Body',
    body: 'Somatic experiencing, breathwork, movement, and equine-assisted practice reconnect clients with their physical selves and restore nervous-system regulation.',
    image: '/images/horses-grazing.jpg',
  },
  {
    title: 'Spirit',
    body: 'Meaning-making, values development, community connection, and time under the desert sky cultivate purpose and the coherence that lasting recovery depends on.',
    image: '/images/sign-night-sky-milky-way.jpg',
  },
];

export default function MindBodySpirit() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-24 lg:py-32 bg-warm-bg" aria-labelledby="mbs-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14 lg:mb-16" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s' }}>
          <p className="section-label mb-5">Mind · Body · Spirit</p>
          <h2 id="mbs-heading" className="text-foreground font-bold tracking-tight mb-5" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3.9vw, 3rem)', lineHeight: 1.03 }}>
            Recovery beyond the <em className="not-italic text-primary">surface</em>.
          </h2>
          <p className="text-foreground/70 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            Most programs stop at stopping substance use. We go further,
            rebuilding every dimension of a person&rsquo;s life.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 lg:gap-6">
          {pillars.map((p, i) => (
            <figure key={p.title} className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-dark-section group" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(22px)', transition: `all 0.95s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.12}s` }}>
              <img src={p.image} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1600ms] ease-out group-hover:scale-[1.06]" />
              <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,5,3,0.1) 30%, rgba(10,5,3,0.6) 65%, rgba(10,5,3,0.94) 100%)' }} />
              <figcaption className="absolute inset-x-6 bottom-6 text-white">
                <h3 className="font-bold mb-3" style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>{p.title}</h3>
                <p className="text-white/85 text-[14.5px] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{p.body}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
