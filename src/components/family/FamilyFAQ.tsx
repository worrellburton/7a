'use client';

import { useEffect, useRef, useState } from 'react';
import { familyFaqs } from './familyFaqs';

export default function FamilyFAQ() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState<number | null>(0);

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
    <section
      ref={ref}
      className="py-24 lg:py-32 bg-white"
      aria-labelledby="family-faq-heading"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-16"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">Family FAQ</p>
          <h2
            id="family-faq-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            What families <em className="not-italic text-primary">actually</em> ask.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Ten direct answers to the questions our admissions team fields
            most often. If yours isn&rsquo;t here, call us at{' '}
            <a href="tel:+18669964308" className="text-primary font-semibold underline decoration-primary/40 hover:decoration-primary">
              (866) 996-4308
            </a>
            .
          </p>
        </div>

        <ul className="divide-y divide-black/10 border-t border-b border-black/10">
          {familyFaqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <li
                key={f.q}
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(12px)',
                  transition: `all 0.8s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.04}s`,
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="w-full flex items-start justify-between gap-6 py-6 text-left group"
                >
                  <h3
                    className="text-foreground font-bold flex-1 group-hover:text-primary transition-colors"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(1.05rem, 1.5vw, 1.25rem)',
                      lineHeight: 1.25,
                    }}
                  >
                    {f.q}
                  </h3>
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
                    maxHeight: isOpen ? '500px' : '0px',
                    transition: 'max-height 0.45s cubic-bezier(0.16,1,0.3,1)',
                  }}
                >
                  <p
                    className="text-foreground/75 leading-relaxed pb-6 pr-14 text-[15.5px]"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {f.a}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
