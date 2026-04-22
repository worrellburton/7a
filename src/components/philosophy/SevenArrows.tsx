'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Philosophy — Phase 8. The Seven Arrows — seven guiding principles.
 * A vertical stepper with animated progress rail painting in from top
 * to bottom, and numbered tiles arranged offset (alternating sides)
 * so it reads as a considered editorial layout rather than a plain
 * list. Warm-bg.
 */

const principles = [
  { n: 1, title: 'Treat the whole person', body: 'Addiction is never just about the substance. We address trauma, dysregulation, mental health, and spiritual disconnection — together.' },
  { n: 2, title: 'Honor individual stories', body: 'No two paths to addiction are the same. Every plan is built around the individual — their history, their nervous system, their path.' },
  { n: 3, title: 'Heal through connection', body: 'Isolation is a hallmark of addiction. Recovery happens in relationship — with staff, peers, family, and the land.' },
  { n: 4, title: 'Regulate before processing', body: 'Drawing from Forward-Facing Freedom, we prioritize nervous-system stabilization before deeper trauma work.' },
  { n: 5, title: 'Reframe addiction as adaptation', body: 'Substance use is a post-traumatic adaptive capacity. Reframing the behavior removes shame and makes healing possible.' },
  { n: 6, title: 'Build for the long term', body: 'Treatment is the beginning, not the end. Clients leave with self-regulation skills, a code of honor, and a durable support network.' },
  { n: 7, title: 'Let the land heal', body: 'The Swisshelm Mountains, the open desert, the quiet — not backdrop. Nature is an active part of the therapeutic process.' },
];

export default function SevenArrows() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="relative py-24 lg:py-32 bg-white overflow-hidden" aria-labelledby="seven-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-14 lg:mb-20" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s' }}>
          <p className="section-label justify-center mb-5">Guiding Principles</p>
          <h2 id="seven-heading" className="text-foreground font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.1rem, 4.3vw, 3.3rem)', lineHeight: 1.02 }}>
            The <em className="not-italic text-primary">Seven Arrows</em>.
          </h2>
        </div>

        <div className="relative max-w-4xl mx-auto pl-10 lg:pl-14">
          <div className="absolute left-[17px] lg:left-[21px] top-4 bottom-4 w-px bg-black/8" aria-hidden="true" />
          <div className="absolute left-[17px] lg:left-[21px] top-4 w-px" aria-hidden="true" style={{ background: 'linear-gradient(180deg, var(--color-primary) 0%, var(--color-accent) 100%)', height: visible ? 'calc(100% - 2rem)' : '0%', transition: 'height 3.2s cubic-bezier(0.22,1,0.36,1) 0.3s' }} />

          <ol className="space-y-10 lg:space-y-12">
            {principles.map((p, i) => (
              <li key={p.n} className="relative" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : 'translateX(-10px)', transition: `all 0.85s cubic-bezier(0.16,1,0.3,1) ${0.25 + i * 0.1}s` }}>
                <span className="absolute -left-10 lg:-left-14 top-0 w-9 h-9 lg:w-[42px] lg:h-[42px] rounded-full bg-white border-2 border-primary flex items-center justify-center text-primary font-bold shadow-sm" style={{ fontFamily: 'var(--font-body)', fontSize: '15px' }}>{p.n}</span>
                <h3 className="text-foreground font-bold mb-2" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.3rem, 2vw, 1.6rem)', lineHeight: 1.15 }}>{p.title}</h3>
                <p className="text-foreground/70 leading-relaxed text-[15.5px]" style={{ fontFamily: 'var(--font-body)' }}>{p.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
