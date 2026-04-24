'use client';


import { useMemo, useState } from 'react';

const BRANDFETCH_CLIENT_ID = '1id3n10pdBTarCHI0db';

const insuranceLogos = [
  { name: 'Aetna', domain: 'aetna.com' },
  { name: 'Blue Cross Blue Shield', domain: 'bcbs.com' },
  { name: 'Cigna', domain: 'cigna.com' },
  { name: 'Humana', domain: 'humana.com' },
  { name: 'UnitedHealthcare', domain: 'uhc.com' },
  { name: 'TRICARE', domain: 'tricare.mil' },
];

type Persona = 'self' | 'loved_one';

interface Faq {
  question: string;
  answer: string;
  /** Which reader(s) this question is most relevant to. Questions
   *  tagged 'both' always show regardless of filter. */
  persona: Persona | 'both';
  /** When true, this row also shows the insurance-logo strip. */
  insurance?: boolean;
}

const faqs: Faq[] = [
  // For yourself
  {
    question: "I'm thinking about treatment — how do I actually start?",
    answer:
      'Call (866) 996-4308 or fill out the form on this page. An admissions counselor answers 24/7, asks a few questions about what is going on, verifies your insurance, and walks you through next steps. No sales pitch; you can hang up at any point. Many clients begin treatment within 24–48 hours of that first call.',
    persona: 'self',
  },
  {
    question: 'Is my information kept confidential?',
    answer:
      'Absolutely. Seven Arrows Recovery is fully HIPAA compliant. Nothing you share with admissions is disclosed without your written permission — including to employers or family members. Federal 42 CFR Part 2 adds an additional layer of protection for substance-use records.',
    persona: 'self',
  },
  {
    question: 'What does a typical day look like?',
    answer:
      'Mornings start with a check-in, followed by individual or group therapy, mid-day movement or a holistic modality (equine, yoga, bodywork), lunch on campus, afternoon clinical programming, then a quieter evening with reflection, recovery meetings, or free time on the ranch. Structured, paced to the nervous system, and designed so every hour has a purpose.',
    persona: 'self',
  },
  {
    question: 'What should I bring — and what should I leave home?',
    answer:
      'Comfortable clothes for a range of weather, toiletries, any prescribed medications in original bottles, a journal, and a photo or two. Phones are limited during the first stabilization stretch by design, not as punishment — the goal is to give your attention a place to land. Admissions sends a full packing list once your intake date is set.',
    persona: 'self',
  },

  // For a loved one
  {
    question: 'How do I bring up treatment with someone I love?',
    answer:
      'Short, direct, and early in the day works better than long conversations at night. Lead with what you’ve observed, not what you’ve concluded (“I’ve been scared since last Tuesday” beats “you’re an addict”). Our admissions team can coach you through the specific opening lines. If they refuse, we can also walk you through whether a professional intervention makes sense.',
    persona: 'loved_one',
  },
  {
    question: 'What if my loved one refuses to go?',
    answer:
      'Resistance is almost universal at first — it is not a signal to stop trying. Keep the door open, avoid ultimatums you won’t keep, and get support for yourself. A trained interventionist (we can recommend one) dramatically increases the odds of a yes. Call us — we do this conversation every day and we won’t pressure you.',
    persona: 'loved_one',
  },
  {
    question: 'Can I visit, call, or send things during treatment?',
    answer:
      'Yes. Family contact is part of how we see recovery working — not a perk. Phone windows are scheduled so they don’t compete with clinical blocks, and family visits are coordinated with the clinical team so everyone is ready for them. Most clients host a family weekend during their stay; we can walk you through the format on a first call.',
    persona: 'loved_one',
  },
  {
    question: 'How do I know it’s time to act?',
    answer:
      'You already know something is wrong — that instinct is worth trusting. Tangible signs: escalating use, failed attempts to cut back, hiding or lying, job or legal trouble, withdrawal when they stop. If you’re asking the question, it is almost always worth a 15-minute phone call with our team to talk it through. No pressure, no commitment.',
    persona: 'loved_one',
  },

  // Both
  {
    question: 'What types of addiction does Seven Arrows Recovery treat?',
    answer:
      'Alcohol addiction, drug addiction (including opioids, methamphetamine, cocaine, and prescription drugs), dual diagnosis (co-occurring mental-health and substance-use disorders), and trauma-related conditions through our TraumAddiction™ approach.',
    persona: 'both',
  },
  {
    question: 'Does Seven Arrows accept insurance?',
    answer:
      'Yes — most major plans including Aetna, Blue Cross Blue Shield, Cigna, Humana, UnitedHealthcare, and TRICARE. Verification is free and takes about 15 minutes; you’ll know your benefits before you commit to anything.',
    persona: 'both',
    insurance: true,
  },
  {
    question: 'How long is the treatment program?',
    answer:
      'Individualized. Residential programs typically run 30, 60, or 90+ days based on clinical need and insurance coverage. Our team revisits the length-of-stay conversation with you (and, where applicable, your family) as progress dictates — no arbitrary discharges.',
    persona: 'both',
  },
  {
    question: 'What makes Seven Arrows different from other rehab centers?',
    answer:
      'A boutique facility at the base of the Swisshelm Mountains with a deliberately small census, 1:1 primary-clinician care, and a combination of evidence-based clinical work and holistic modalities. Our TraumAddiction™ framework treats trauma and substance use as one clinical problem rather than two separate tracks.',
    persona: 'both',
  },
];

const FILTERS: { id: Persona; label: string; hint: string }[] = [
  { id: 'self', label: 'For yourself', hint: 'If you are considering treatment' },
  { id: 'loved_one', label: 'For a loved one', hint: 'If you are worried about someone' },
];

export default function FAQSection() {
  const [persona, setPersona] = useState<Persona>('self');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  // Keep the "both" questions always visible; persona-specific rows
  // appear only when their chip is active.
  const visible = useMemo(() => {
    return faqs.filter((f) => f.persona === 'both' || f.persona === persona);
  }, [persona]);

  function handleFilter(next: Persona) {
    if (next === persona) return;
    setPersona(next);
    setOpenIndex(0);
  }

  return (
    <section className="py-20 lg:py-28 bg-warm-bg" aria-labelledby="faq-heading">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6">
          <p className="section-label justify-center mb-3">Common Questions</p>
          <h2 id="faq-heading" className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-sm text-foreground/60">
            Two different conversations. Pick whichever one fits.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="FAQ audience filter"
          className="mx-auto mb-8 inline-flex rounded-full border border-black/10 bg-white p-1 shadow-sm w-full max-w-md"
        >
          {FILTERS.map((f) => {
            const active = persona === f.id;
            return (
              <button
                key={f.id}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => handleFilter(f.id)}
                className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-foreground/70 hover:text-foreground'
                }`}
                title={f.hint}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-3" role="list">
          {visible.map((faq, index) => (
            <div
              key={`${persona}-${faq.question}`}
              className="border border-gray-100 rounded-xl overflow-hidden bg-white"
              role="listitem"
            >
              <button
                className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-warm-bg/50 transition-colors"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                aria-expanded={openIndex === index}
              >
                <span className="text-sm font-semibold text-foreground pr-4" style={{ fontFamily: 'var(--font-body)' }}>
                  {faq.question}
                </span>
                <svg
                  className={`w-5 h-5 text-primary shrink-0 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-5">
                  <p className="text-sm text-foreground/70 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                    {faq.answer}
                  </p>
                  {faq.insurance && (
                    <div className="flex flex-wrap items-center gap-6 mt-5 pt-5 border-t border-gray-100">
                      {insuranceLogos.map((logo) => (
                        <img
                          key={logo.domain}
                          src={`https://cdn.brandfetch.io/${logo.domain}/fallback/404/theme/dark/h/60/w/160/logo?c=${BRANDFETCH_CLIENT_ID}`}
                          alt={logo.name}
                          className="h-6 w-auto max-w-[120px] object-contain opacity-60 hover:opacity-100 transition-opacity"
                          loading="lazy"
                          onError={(e) => {
                            const el = e.currentTarget;
                            el.style.display = 'none';
                            const span = document.createElement('span');
                            span.textContent = logo.name;
                            span.className = 'text-xs font-semibold text-foreground/50 whitespace-nowrap';
                            el.parentElement?.appendChild(span);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
