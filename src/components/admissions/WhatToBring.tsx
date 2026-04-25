'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';

interface Category {
  title: string;
  gloss: string;
  items: string[];
  glyph: ReactElement;
}

const s = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const categories: Category[] = [
  {
    title: 'Clothing',
    gloss: 'Comfortable, layerable, Arizona-ready',
    glyph: (<svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}><path d="M10 6l-6 4 2 4 4-2v14h16V12l4 2 2-4-6-4-4 2a4 4 0 0 1-8 0z" /></svg>),
    items: [
      '7–10 days of casual clothing (we do laundry on-site)',
      'Warm layers for evenings (sweatshirt, hoodie, jacket)',
      'Athletic wear for yoga, hiking, and ranch activities',
      'Sturdy closed-toe shoes + a comfortable pair for groups',
      'A pair of boots if you have them (for the arena)',
      'Modest sleepwear and swimsuit (for outdoor relaxation)',
      'Sun hat, sunglasses, and a warm hat for cool nights',
    ],
  },
  {
    title: 'Toiletries & personal',
    gloss: 'Alcohol-free, unopened where possible',
    glyph: (<svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}><path d="M10 4h12v6H10z" /><path d="M8 10h16v16a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2z" /><path d="M14 16v6" /><path d="M18 16v6" /></svg>),
    items: [
      'Shampoo, conditioner, body wash (alcohol-free preferred)',
      'Toothbrush, toothpaste, floss',
      'Deodorant (alcohol-free), moisturizer, sunscreen SPF 30+',
      'Feminine hygiene products if needed',
      'Hair ties, hair products',
      'Contacts + solution, or glasses + case',
      'Prescription toiletries in original packaging',
    ],
  },
  {
    title: 'Medications',
    gloss: 'In original containers, reviewed at intake',
    glyph: (<svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}><rect x="4" y="12" width="24" height="10" rx="5" /><path d="M16 12v10" /></svg>),
    items: [
      'All prescribed medications in their original labeled containers',
      'Enough of each to cover your full stay (30, 60, or 90 days)',
      'A written list of meds with dosages and prescribing physician',
      'Over-the-counter meds only if approved at intake (call to confirm)',
      'Medical devices: CPAP, brace, etc. — bring them',
      'MAT medications (buprenorphine, naltrexone) welcomed — tell us at intake',
    ],
  },
  {
    title: 'Documents',
    gloss: 'Bring with you; we copy + return',
    glyph: (<svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}><path d="M8 4h12l6 6v18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><path d="M20 4v6h6" /><path d="M11 18h10" /><path d="M11 22h8" /></svg>),
    items: [
      'Government-issued photo ID (driver\'s license or passport)',
      'Insurance card (physical card or photo)',
      'A list of emergency contacts with phone numbers',
      'Prior treatment records if you have them (helpful, not required)',
      'Legal documents relevant to your case (monitoring, court)',
      'Credit card or cash for small personal purchases (under $100)',
    ],
  },
  {
    title: 'Comfort items',
    gloss: 'Bring what reminds you of home',
    glyph: (<svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}><path d="M16 27s-10-6-10-14a6 6 0 0 1 10-4 6 6 0 0 1 10 4c0 8-10 14-10 14z" /></svg>),
    items: [
      'Journal and pens (big yes — you\'ll use it)',
      'Books (non-triggering; we have a library as backup)',
      'Photos of people and pets you love',
      'Small mementos or religious/spiritual objects',
      'A favorite blanket or pillowcase',
      'Stamps and stationery if you like writing letters',
    ],
  },
  {
    title: 'Please don&rsquo;t bring',
    gloss: 'Safety + therapeutic environment',
    glyph: (<svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}><circle cx="16" cy="16" r="12" /><line x1="9" y1="9" x2="23" y2="23" /></svg>),
    items: [
      'Alcohol, drugs, or any substance (including mouthwash with alcohol)',
      'Weapons of any kind',
      'Electronics are limited — laptops, tablets, e-readers held at intake',
      'Outside food or supplements without medical approval',
      'Clothing with drug, alcohol, or explicit imagery',
      'Jewelry or items of significant financial value',
      'Candles, incense, or open-flame items',
    ],
  },
];

export default function WhatToBring() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
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
      className="py-24 lg:py-32 bg-warm-bg"
      aria-labelledby="what-to-bring-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-18"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">What to bring</p>
          <h2
            id="what-to-bring-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            The <em className="not-italic text-primary">honest</em> packing list.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Six categories of what to pack &mdash; and one short list of
            what not to. Admissions will send a printable version when you
            confirm your arrival date.
          </p>
          <p
            className="text-foreground/70 text-[15px] leading-relaxed mt-4"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <strong className="text-foreground/85">Smokers and vapers:</strong>{' '}
            bring enough cigarettes, tobacco, or vape supplies for your full
            stay. The local dollar store carries only a limited selection of
            cigarette brands and does not stock vapes.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {categories.map((c, i) => {
            const isDontBring = c.title.includes('don');
            return (
              <article
                key={c.title}
                className={`relative rounded-2xl border p-6 lg:p-7 ${
                  isDontBring
                    ? 'bg-white border-foreground/15'
                    : 'bg-white border-black/5 shadow-sm'
                }`}
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.08}s`,
                }}
              >
                <div
                  className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5"
                  style={{
                    background: isDontBring
                      ? 'rgba(60,48,42,0.08)'
                      : 'linear-gradient(135deg, rgba(216,137,102,0.16) 0%, rgba(107,42,20,0.08) 100%)',
                    color: isDontBring ? 'rgba(60,48,42,0.85)' : 'var(--color-primary-dark)',
                  }}
                  aria-hidden="true"
                >
                  {c.glyph}
                </div>
                <h3
                  className="text-foreground font-bold mb-1.5"
                  style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', lineHeight: 1.1 }}
                  dangerouslySetInnerHTML={{ __html: c.title }}
                />
                <p
                  className="text-primary text-[11px] tracking-[0.18em] uppercase font-semibold mb-5"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {c.gloss}
                </p>
                <ul className="space-y-2.5">
                  {c.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-foreground/75 text-[14.5px] leading-snug"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {isDontBring ? (
                        <svg className="w-4 h-4 text-foreground/50 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                          <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
                          <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
