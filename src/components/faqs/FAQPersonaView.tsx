'use client';

import { useEffect, useRef, useState } from 'react';
import FAQCategoryNav from './FAQCategoryNav';
import FAQCategorySection from './FAQCategorySection';
import {
  faqCategories,
  type FaqCategory,
  type FaqPersona,
} from './faqData';

// Landing-style persona toggle for the full /who-we-are/faqs page.
// Replaces the prior 6-tab design with the same two-chip pattern used
// on the landing FAQ: "For yourself" vs. "For a loved one". Every
// question still ships in the page's JSON-LD (via faqPageSchema on
// the server) so crawlers see the whole corpus regardless of which
// chip the user has selected.

type SimpleAudience = 'self' | 'loved_one';

const SELF_PERSONAS: FaqPersona[] = ['client', 'military', 'professional', 'private-pay'];
const LOVED_ONE_PERSONAS: FaqPersona[] = ['family'];

const AUDIENCES: { id: SimpleAudience; label: string; hint: string }[] = [
  { id: 'self', label: 'For yourself', hint: 'If you are considering treatment' },
  { id: 'loved_one', label: 'For a loved one', hint: 'If you are worried about someone' },
];

function filterByAudience(audience: SimpleAudience): FaqCategory[] {
  const target = audience === 'self' ? SELF_PERSONAS : LOVED_ONE_PERSONAS;
  return faqCategories
    .map((c) => ({
      ...c,
      items: c.items.filter((i) => i.personas.some((p) => target.includes(p))),
    }))
    .filter((c) => c.items.length > 0);
}

export default function FAQPersonaView() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [audience, setAudience] = useState<SimpleAudience>('self');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const forParam = params.get('for');
    if (forParam === 'loved_one' || forParam === 'family') setAudience('loved_one');
    else if (forParam === 'self' || forParam === 'client') setAudience('self');
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function handleSelect(next: SimpleAudience) {
    if (next === audience) return;
    setAudience(next);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('for', next);
    window.history.replaceState({}, '', url.toString());
  }

  const filtered = filterByAudience(audience);
  const total = filtered.reduce((n, c) => n + c.items.length, 0);

  return (
    <section
      ref={ref}
      className="bg-white py-14 lg:py-20 border-b border-black/5"
      aria-labelledby="faq-persona-heading"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="text-center mb-6 lg:mb-8"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'all 0.7s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <h2
            id="faq-persona-heading"
            className="text-foreground font-bold tracking-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.7rem, 3.2vw, 2.3rem)',
              lineHeight: 1.1,
            }}
          >
            Two different conversations.
          </h2>
          <p className="mt-2 text-sm text-foreground/60 max-w-xl mx-auto">
            Pick whichever one fits. {total} question{total === 1 ? '' : 's'} shown.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="FAQ audience filter"
          className="mx-auto mb-10 lg:mb-12 inline-flex rounded-full border border-black/10 bg-white p-1 shadow-sm w-full max-w-md"
        >
          {AUDIENCES.map((a) => {
            const active = audience === a.id;
            return (
              <button
                key={a.id}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => handleSelect(a.id)}
                className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-foreground/70 hover:text-foreground'
                }`}
                title={a.hint}
              >
                {a.label}
              </button>
            );
          })}
        </div>

        <FAQCategoryNav categories={filtered} />

        <div className="mt-10 space-y-14 lg:space-y-16">
          {filtered.map((cat) => (
            <FAQCategorySection key={cat.id} category={cat} />
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-foreground/50">
              No questions tagged for this audience yet. Switch tabs above.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
