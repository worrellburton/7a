'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Dual Diagnosis — Phase 9. Testimonials specifically from alumni
 * who arrived with a dual diagnosis. Three cards on white bg with
 * Google 4.9 badge.
 */

const voices = [
  {
    quote: 'I had been in and out of treatment for 15 years. Nobody had ever addressed the depression in the same room as the drinking. Seven Arrows did.',
    author: 'Michael T.',
    tag: 'Alumnus · depression + AUD',
  },
  {
    quote: 'I came in on four medications. By the time I left, my psychiatrist and my therapist knew each other by first name and my plan was finally one plan, not two.',
    author: 'Anonymous',
    tag: 'Alumna · PTSD + opioid use',
  },
  {
    quote: "Our daughter's anxiety and her substance use always fed each other. Watching one team treat both, in real time, is what finally broke the cycle.",
    author: 'Parents of alumna',
    tag: 'Anxiety + stimulant use',
  },
];

export default function DualVoices() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.18 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-24 lg:py-32 bg-white" aria-labelledby="dv-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-14" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s' }}>
          <div className="inline-flex items-center gap-3 bg-warm-bg rounded-full px-4 py-2 mb-6">
            <span className="flex items-center text-[#f5a623]">
              {[0,1,2,3,4].map((i) => (
                <svg key={i} className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
              ))}
            </span>
            <span className="text-sm font-semibold text-foreground" style={{ fontFamily: 'var(--font-body)' }}>4.9 · Verified Alumni Reviews</span>
          </div>
          <p className="section-label mb-5">In Their Own Words</p>
          <h2 id="dv-heading" className="text-foreground font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3.8vw, 2.9rem)', lineHeight: 1.03 }}>
            What <em className="not-italic text-primary">integrated care</em> felt like.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5 lg:gap-7">
          {voices.map((v, i) => (
            <figure key={v.author + i} className="rounded-2xl bg-warm-bg p-7 lg:p-8 border border-black/5" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(22px)', transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.12}s` }}>
              <div className="flex items-center gap-0.5 mb-4 text-[#f5a623]">
                {[0,1,2,3,4].map((n) => (
                  <svg key={n} className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
                ))}
              </div>
              <blockquote className="text-foreground leading-[1.4] mb-6" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.05rem, 1.25vw, 1.15rem)' }}>
                <span className="text-primary mr-1" style={{ fontSize: '1.6em', lineHeight: 0 }}>&ldquo;</span>
                {v.quote}
              </blockquote>
              <figcaption>
                <p className="text-foreground font-bold text-sm" style={{ fontFamily: 'var(--font-display)' }}>{v.author}</p>
                <p className="text-foreground/55 text-[12px] uppercase tracking-[0.18em] font-semibold mt-1" style={{ fontFamily: 'var(--font-body)' }}>{v.tag}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
