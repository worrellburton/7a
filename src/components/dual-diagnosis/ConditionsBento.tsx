'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';

/**
 * Dual Diagnosis — Phase 4. Bento of the eight most common
 * co-occurring mental-health conditions we treat. Each tile has a
 * custom SVG glyph, the condition name, and a brief plain-language
 * description. Warm-bg.
 */

type Cond = { title: string; body: string; Icon: (p: { className?: string }) => ReactElement };

const conditions: Cond[] = [
  {
    title: 'Major depression',
    body: 'Persistent sadness, anhedonia, and fatigue that often drives self-medication.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 18c3-6 13-6 16 0" /><circle cx="9" cy="10" r="1" fill="currentColor" /><circle cx="15" cy="10" r="1" fill="currentColor" /></svg>
    ),
  },
  {
    title: 'Generalized anxiety',
    body: 'Chronic worry, muscle tension, and a nervous system stuck on high alert.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /><path d="M9 4l-1-1M15 4l1-1" /></svg>
    ),
  },
  {
    title: 'PTSD',
    body: 'Post-traumatic stress — intrusions, avoidance, hyperarousal, sleep disruption.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l9 4v6c0 5-4 7-9 8-5-1-9-3-9-8V7z" /><path d="M9 12l2 2 4-4" /></svg>
    ),
  },
  {
    title: 'Bipolar disorder',
    body: 'Cycling between depression and elevated or activated states, each with its own risks.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0" /></svg>
    ),
  },
  {
    title: 'Panic disorder',
    body: 'Recurrent, sudden episodes of intense fear with strong physiological symptoms.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.8 5.8L20 10l-4.8 3.5L17 20l-5-3.5L7 20l1.8-6.5L4 10l6.2-1.2z" /></svg>
    ),
  },
  {
    title: 'OCD',
    body: 'Intrusive thoughts and compulsive behaviors that often intertwine with substance use.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><path d="M12 4v2M12 18v2M4 12h2M18 12h2" /></svg>
    ),
  },
  {
    title: 'Borderline personality',
    body: 'Intense emotional reactivity, identity instability, and patterns of relational chaos.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16M4 10h16M4 16h16M4 20h16" strokeDasharray="2 4" /></svg>
    ),
  },
  {
    title: 'ADHD',
    body: 'Attention regulation and impulse control challenges that often predate substance use.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2-6 4 12 2-8 2 4h4" /></svg>
    ),
  },
];

export default function ConditionsBento() {
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
    <section ref={ref} className="py-24 lg:py-32 bg-warm-bg" aria-labelledby="cond-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14 lg:mb-16" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s' }}>
          <p className="section-label mb-5">Common Co-Occurring Conditions</p>
          <h2 id="cond-heading" className="text-foreground font-bold tracking-tight mb-5" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3.9vw, 3rem)', lineHeight: 1.03 }}>
            The <em className="not-italic text-primary">eight</em> we see most.
          </h2>
          <p className="text-foreground/70 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            Every condition below changes substance use &mdash; and every
            substance changes the condition. Both get treated, together, here.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {conditions.map((c, i) => {
            const Icon = c.Icon;
            return (
              <article key={c.title} className="rounded-2xl bg-white p-6 border border-black/5 hover:border-primary/25 transition-colors" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(18px)', transition: `all 0.85s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.06}s` }}>
                <div className="w-11 h-11 rounded-xl mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgba(188,107,74,0.1)' }}>
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-foreground font-bold mb-2" style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', lineHeight: 1.15 }}>{c.title}</h3>
                <p className="text-foreground/70 text-[14px] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{c.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
