'use client';

import { useEffect, useRef, useState } from 'react';
import { equineFaqs } from './equineFaqs';

/**
 * Phase 9 — EAP FAQ accordion. Every answer is rendered into the DOM
 * whether open or closed (via collapsed max-height) so crawlers and
 * LLMs always see the full text. Matches the /who-we-are/faqs
 * accordion pattern so visitors have a consistent interaction model
 * across the site.
 */
export default function EquineFAQ() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
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
      className="py-24 lg:py-32 bg-white"
      aria-labelledby="equine-faq-heading"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <header
          className="mb-12 lg:mb-14"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">Frequently asked about EAP</p>
          <h2
            id="equine-faq-heading"
            className="text-foreground font-bold tracking-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            {equineFaqs.length} answers, <em className="not-italic text-primary">no fluff</em>.
          </h2>
        </header>

        <ul className="divide-y divide-black/10 border-t border-b border-black/10">
          {equineFaqs.map((item) => {
            const isOpen = open === item.id;
            return (
              <li key={item.id} id={`eap-${item.id}`} className="scroll-mt-28">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : item.id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-start justify-between gap-6 py-6 text-left group"
                >
                  <h3
                    className="text-foreground font-bold flex-1 group-hover:text-primary transition-colors"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(1.05rem, 1.55vw, 1.25rem)',
                      lineHeight: 1.25,
                    }}
                    dangerouslySetInnerHTML={{ __html: item.q }}
                  />
                  <span
                    aria-hidden="true"
                    className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full border border-primary/30 text-primary group-hover:bg-primary group-hover:text-white transition-colors mt-0.5"
                    style={{
                      transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease, background-color 0.3s ease, color 0.3s ease',
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
                      <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
                    </svg>
                  </span>
                </button>
                <div
                  className="overflow-hidden"
                  style={{
                    maxHeight: isOpen ? '800px' : '0px',
                    transition: 'max-height 0.45s cubic-bezier(0.16,1,0.3,1)',
                  }}
                >
                  <p
                    className="text-foreground/75 leading-relaxed pb-6 pr-14 text-[15.5px]"
                    style={{ fontFamily: 'var(--font-body)' }}
                    dangerouslySetInnerHTML={{ __html: item.a }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
