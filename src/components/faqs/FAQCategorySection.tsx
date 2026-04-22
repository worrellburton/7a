'use client';

import { useState } from 'react';
import type { FaqCategory } from './faqData';

/**
 * FAQs — single category section with accordion items. Each Q&A
 * renders the full answer into the DOM whether the accordion is
 * open or closed (via hidden overflow + animated max-height) so
 * crawlers and LLMs always see the complete text. Every question
 * has a sluggable `#<category>-<id>` anchor for deep-linking and
 * sharing.
 */
export default function FAQCategorySection({ category }: { category: FaqCategory }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section
      id={`category-${category.id}`}
      className="scroll-mt-24 py-16 lg:py-20 even:bg-warm-bg odd:bg-white"
      aria-labelledby={`cat-heading-${category.id}`}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-10 lg:mb-12">
          <p
            className="text-[10px] font-semibold tracking-[0.28em] uppercase text-primary mb-3"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {category.hint}
          </p>
          <h2
            id={`cat-heading-${category.id}`}
            className="text-foreground font-bold tracking-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.7rem, 3.2vw, 2.3rem)',
              lineHeight: 1.1,
            }}
          >
            {category.label}
          </h2>
        </header>

        <ul className="divide-y divide-black/10 border-t border-b border-black/10">
          {category.items.map((item) => {
            const anchorId = `${category.id}-${item.id}`;
            const isOpen = open === anchorId;
            return (
              <li key={anchorId} id={anchorId} className="scroll-mt-28">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : anchorId)}
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
                  >
                    {item.q}
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
                    maxHeight: isOpen ? '800px' : '0px',
                    transition: 'max-height 0.45s cubic-bezier(0.16,1,0.3,1)',
                  }}
                >
                  <p
                    className="text-foreground/75 leading-relaxed pb-6 pr-14 text-[15.5px]"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {item.a}
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
