'use client';

import { useState } from 'react';

interface FaqItem {
  q: string;
  a: string;
}

// Accordion-style FAQ block for substance / treatment pages. Mirrors
// the home-page FAQ visually (warm-bg section, white cards, chevron
// toggle) but skips the persona filter — substance briefs ship a
// flat list of questions. The section heading is an H2 and each
// question is an H3 so the per-page outline stays semantic for SEO.
export default function SubstanceFAQ({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-20 lg:py-28 bg-warm-bg" aria-labelledby="substance-faq-heading">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <p className="section-label justify-center mb-3">Common Questions</p>
          <h2
            id="substance-faq-heading"
            className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground"
          >
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3" role="list">
          {items.map((faq, index) => {
            const open = openIndex === index;
            return (
              <div
                key={faq.q}
                className="border border-gray-100 rounded-xl overflow-hidden bg-white"
                role="listitem"
              >
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-warm-bg/50 transition-colors"
                  onClick={() => setOpenIndex(open ? null : index)}
                  aria-expanded={open}
                >
                  <h3
                    className="text-sm font-semibold text-foreground pr-4"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {faq.q}
                  </h3>
                  <svg
                    className={`w-5 h-5 text-primary shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {open && (
                  <div className="px-6 pb-5">
                    <p
                      className="text-sm text-foreground/70 leading-relaxed"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
