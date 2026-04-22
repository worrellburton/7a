'use client';

import { useEffect, useRef, useState } from 'react';
import type { SubstancePersonas as PersonasContent } from '@/lib/substances/types';

/**
 * Substance — Phase 6. Realistic client archetypes.
 */
export default function SubstancePersonas({ content }: { content: PersonasContent }) {
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
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-24 lg:py-32 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-20"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">{content.eyebrow}</p>
          <h2
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.05,
            }}
          >
            {content.title}
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {content.body}
          </p>
        </div>

        <ol className="space-y-4 lg:space-y-5">
          {content.personas.map((p, i) => (
            <li
              key={p.label}
              className="relative rounded-2xl border border-black/5 bg-warm-bg p-6 lg:p-8 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(-14px)',
                transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.1}s`,
              }}
            >
              <div className="grid md:grid-cols-12 gap-4 md:gap-8 items-start">
                <div className="md:col-span-4">
                  <p
                    className="text-[11px] tracking-[0.22em] uppercase font-semibold text-primary mb-2"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {`Pattern ${String(i + 1).padStart(2, '0')}`}
                  </p>
                  <h3
                    className="text-foreground font-bold mb-0"
                    style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', lineHeight: 1.15 }}
                  >
                    {p.label}
                  </h3>
                </div>
                <div className="md:col-span-8">
                  <p
                    className="text-foreground/85 text-[1.05rem] mb-2"
                    style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
                  >
                    {p.headline}
                  </p>
                  <p
                    className="text-foreground/70 leading-relaxed"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {p.body}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
