'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Dual Diagnosis — Phase 8. Trauma-informed layer — editorial beat
 * connecting the common "trauma" thread running through both the
 * mental-health condition and the substance use. Warm-bg, quiet,
 * serif pull-quote + three short paragraphs.
 */
export default function TraumaLayer() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="relative py-24 lg:py-32 bg-warm-bg overflow-hidden" aria-labelledby="trauma-heading">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 50% at 85% 15%, rgba(216,137,102,0.12) 0%, rgba(216,137,102,0) 60%), radial-gradient(ellipse 45% 50% at 15% 85%, rgba(188,107,74,0.08) 0%, rgba(188,107,74,0) 55%)' }} />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(14px)', transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.1s' }}>
          <p className="section-label mb-5">The Trauma Layer</p>
          <h2 id="trauma-heading" className="text-foreground font-bold tracking-tight mb-10" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.03 }}>
            There is almost always a <em className="not-italic text-primary">third thing</em> underneath both.
          </h2>
        </div>

        <blockquote className="border-l-2 border-accent/70 pl-6 lg:pl-8 mb-12" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : 'translateX(-10px)', transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.3s' }}>
          <p className="text-foreground leading-snug" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 2.1vw, 1.8rem)', fontStyle: 'italic' }}>
            The mental-health symptoms and the substance use are both sitting on top of the trauma. Treat the trauma and both of them start to loosen.
          </p>
        </blockquote>

        <div className="space-y-5 text-foreground/75 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)', opacity: visible ? 1 : 0, transition: 'opacity 0.95s ease 0.55s' }}>
          <p>
            Our TraumAddiction<span className="align-super text-[11px]">®</span> approach holds trauma as the
            common substrate under most dual diagnoses. Anxiety gets louder
            after a hard session. Substance use quiets it again. The cycle is
            downstream of the same nervous-system injury.
          </p>
          <p className="text-foreground/60">
            That is why our integrated plan is not just &ldquo;therapy plus
            meds.&rdquo; Trauma work — titrated, consent-based, done only when
            the client&rsquo;s nervous system is ready — sits at the center of
            both tracks, addressing what drives them both.
          </p>
        </div>
      </div>
    </section>
  );
}
