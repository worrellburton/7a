'use client';

import { useEffect, useRef, useState } from 'react';
import { faqCategories as allCategories, type FaqCategory } from './faqData';

/**
 * FAQs — Category nav. Chip row of topic jump-links that scroll to
 * the matching <section id="category-<id>"> on the page. No sticky
 * behavior by default — it lives right under the hero so visitors
 * and LLMs can see the full topic inventory at a glance.
 *
 * Accepts an optional `categories` prop so the persona-tab container
 * can narrow the chip list to just the categories that have questions
 * for the active persona.
 */
export default function FAQCategoryNav({ categories }: { categories?: FaqCategory[] }) {
  const list = categories ?? allCategories;
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const totalAnswers = list.reduce((n, c) => n + c.items.length, 0);
  const topicNoun = list.length === 1 ? 'topic' : 'topics';

  return (
    <section
      id="categories"
      ref={ref}
      className="scroll-mt-20 py-14 lg:py-16 bg-warm-bg border-b border-black/5"
      aria-label="FAQ topics"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <p
          className="section-label mb-5"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          Browse by topic
        </p>
        <h2
          className="text-foreground font-bold tracking-tight mb-8"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.6rem, 2.8vw, 2.1rem)',
            lineHeight: 1.1,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.85s cubic-bezier(0.16,1,0.3,1) 0.15s',
          }}
        >
          {list.length} {topicNoun}, {totalAnswers} answer{totalAnswers === 1 ? '' : 's'}.
        </h2>
        <ul className="flex flex-wrap gap-2.5">
          {list.map((c, i) => (
            <li
              key={c.id}
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(8px)',
                transition: `all 0.75s cubic-bezier(0.16,1,0.3,1) ${0.2 + i * 0.05}s`,
              }}
            >
              <a
                href={`#category-${c.id}`}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-white border border-black/10 text-foreground/80 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {c.label}
                <span className="text-[11px] tracking-[0.12em] uppercase text-foreground/45 font-semibold">
                  {c.items.length}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
