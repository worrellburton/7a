'use client';

import { useEffect, useRef, useState } from 'react';
import FAQCategoryNav from './FAQCategoryNav';
import FAQCategorySection from './FAQCategorySection';
import {
  faqCategories,
  faqPersonas,
  filterCategoriesByPersona,
  type FaqPersona,
  type PersonaDefinition,
} from './faqData';

/**
 * FAQs — persona-switched container.
 *
 * Renders a pill tab strip of personas, then the existing category nav
 * and accordion sections filtered to the active persona. Persona choice
 * is mirrored into the URL as `?for=<persona>` so it's linkable and
 * survives refresh, but the underlying corpus stays a single server-
 * rendered source of truth for the FAQPage JSON-LD schema (the crawl
 * path is unaffected by UI filtering).
 */

type ActivePersona = FaqPersona | 'all';

function isPersona(value: string | null): value is ActivePersona {
  if (!value) return false;
  return faqPersonas.some((p) => p.id === value);
}

export default function FAQPersonaView() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState<ActivePersona>('all');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const forParam = params.get('for');
    if (isPersona(forParam)) {
      setActive(forParam);
    }
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

  const handleSelect = (id: ActivePersona) => {
    setActive(id);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (id === 'all') url.searchParams.delete('for');
    else url.searchParams.set('for', id);
    window.history.replaceState({}, '', url.toString());
  };

  const filtered = filterCategoriesByPersona(active);
  const activeDef: PersonaDefinition =
    faqPersonas.find((p) => p.id === active) ?? faqPersonas[0];
  const totalForActive = filtered.reduce((n, c) => n + c.items.length, 0);
  const totalAll = faqCategories.reduce((n, c) => n + c.items.length, 0);

  return (
    <>
      <section
        id="personas"
        ref={ref}
        aria-label="Filter FAQs by who's asking"
        className="scroll-mt-20 py-16 lg:py-20 bg-white border-b border-black/5"
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
            Who&rsquo;s asking?
          </p>
          <h2
            className="text-foreground font-bold tracking-tight mb-6"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 3.2vw, 2.4rem)',
              lineHeight: 1.08,
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(10px)',
              transition: 'all 0.85s cubic-bezier(0.16,1,0.3,1) 0.15s',
            }}
          >
            The answers change depending on{' '}
            <em className="not-italic text-primary">whose</em> questions these are.
          </h2>
          <p
            className="text-foreground/65 leading-relaxed max-w-2xl text-[15.5px] mb-8"
            style={{
              fontFamily: 'var(--font-body)',
              opacity: visible ? 1 : 0,
              transition: 'opacity 0.9s ease 0.3s',
            }}
          >
            Pick the one that fits best and we&rsquo;ll narrow the list to the
            questions that population asks most. The full corpus stays one click
            away.
          </p>

          <div
            role="tablist"
            aria-label="FAQ personas"
            className="flex flex-wrap gap-2.5"
          >
            {faqPersonas.map((p, i) => {
              const isActive = p.id === active;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleSelect(p.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${
                    isActive
                      ? 'bg-primary border-primary text-white'
                      : 'bg-white border-black/10 text-foreground/80 hover:text-primary hover:border-primary/30 hover:bg-primary/5'
                  }`}
                  style={{
                    fontFamily: 'var(--font-body)',
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(8px)',
                    transition: `all 0.75s cubic-bezier(0.16,1,0.3,1) ${0.35 + i * 0.05}s, background-color 0.2s, border-color 0.2s, color 0.2s`,
                  }}
                >
                  {p.shortLabel}
                  <span
                    className={`text-[11px] tracking-[0.12em] uppercase font-semibold ${
                      isActive ? 'text-white/70' : 'text-foreground/45'
                    }`}
                  >
                    {p.id === 'all'
                      ? totalAll
                      : faqCategories.reduce(
                          (n, c) =>
                            n + c.items.filter((i) => i.personas.includes(p.id as FaqPersona)).length,
                          0,
                        )}
                  </span>
                </button>
              );
            })}
          </div>

          <p
            className="mt-7 text-foreground/55 text-sm leading-relaxed max-w-2xl"
            style={{
              fontFamily: 'var(--font-body)',
            }}
          >
            <span className="font-semibold text-foreground/80">
              {activeDef.label}:
            </span>{' '}
            {activeDef.tagline}
            {active !== 'all' && (
              <>
                {' '}
                <span className="text-foreground/50">
                  Showing {totalForActive} of {totalAll} answers.
                </span>{' '}
                <button
                  type="button"
                  onClick={() => handleSelect('all')}
                  className="font-semibold text-primary hover:underline"
                >
                  See all →
                </button>
              </>
            )}
          </p>
        </div>
      </section>

      <FAQCategoryNav categories={filtered} key={`nav-${active}`} />

      {filtered.length === 0 ? (
        <section className="py-20 bg-white text-center">
          <p className="text-foreground/60 text-lg" style={{ fontFamily: 'var(--font-body)' }}>
            No questions tagged for this audience yet.
          </p>
        </section>
      ) : (
        filtered.map((c) => <FAQCategorySection key={`${active}-${c.id}`} category={c} />)
      )}
    </>
  );
}
