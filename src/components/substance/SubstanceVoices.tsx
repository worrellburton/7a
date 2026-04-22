'use client';

import { useEffect, useRef, useState } from 'react';
import type { SubstanceVoices as VoicesContent } from '@/lib/substances/types';

/**
 * Substance — Phase 9. Portrait tiles with ken-burns zoom + overlay
 * quotes. Three voices by default.
 */
export default function SubstanceVoices({ content }: { content: VoicesContent }) {
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
    <section ref={ref} className="py-24 lg:py-32 bg-warm-bg relative overflow-hidden">
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
          {content.body && (
            <p
              className="text-foreground/70 text-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {content.body}
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-5 lg:gap-6">
          {content.voices.map((q, i) => (
            <figure
              key={q.attribution}
              className="relative overflow-hidden rounded-3xl aspect-[4/5] bg-dark-section"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(22px)',
                transition: `all 1s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.12}s`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={q.photo}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  transform: visible ? 'scale(1.05)' : 'scale(1.12)',
                  transition: 'transform 14s ease-out',
                }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(20,10,6,0.2) 0%, rgba(20,10,6,0.55) 55%, rgba(20,10,6,0.92) 100%)',
                }}
              />
              <figcaption className="relative z-10 h-full flex flex-col justify-end p-7 lg:p-9 text-white">
                <span
                  aria-hidden="true"
                  className="block text-accent mb-2 leading-none"
                  style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 4vw, 3.5rem)' }}
                >
                  &ldquo;
                </span>
                <blockquote
                  className="text-white/95 leading-snug"
                  style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.05rem, 1.55vw, 1.35rem)' }}
                >
                  {q.quote}
                </blockquote>
                <p
                  className="mt-5 pt-4 border-t border-white/15 text-[11px] tracking-[0.22em] uppercase font-semibold text-accent"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {q.attribution}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
