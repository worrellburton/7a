'use client';

import { useState } from 'react';

/**
 * Phase 9 — FAQ accordion, redesigned.
 *
 * Same three questions the legacy page answered, now styled with
 * serif question heads, a subtle accent marker, and a smooth expand
 * animation. Wrapped in a calm cream-on-white frame so it reads as a
 * considered pause before the final CTA.
 */

const faqs = [
  {
    question: 'What types of addiction do you treat at your AZ facility?',
    answer:
      'Seven Arrows Recovery treats alcohol addiction, opioid and heroin dependency, benzodiazepine dependence (Xanax, Klonopin, Ativan, Valium), stimulant addiction (cocaine, methamphetamine), ketamine and inhalant use, and co-occurring mental-health conditions (dual diagnosis). Every treatment plan is tailored to the substances and underlying conditions involved.',
  },
  {
    question: 'Do you accept out-of-state patients?',
    answer:
      'Absolutely. Many of our clients travel from outside Arizona for treatment. Research consistently shows that seeking treatment away from familiar environments and triggers significantly improves outcomes. Our admissions team assists with travel coordination and can often facilitate admission within 24 to 48 hours.',
  },
  {
    question: 'Will my insurance cover residential treatment at Seven Arrows?',
    answer:
      'We accept most major insurance plans including Aetna, Blue Cross Blue Shield, Cigna, Humana, UnitedHealthcare, Anthem, and TRICARE. Our admissions team provides free, confidential insurance verification so you know your coverage before committing. Call (866) 996-4308 to verify your benefits today.',
  },
  {
    question: 'How long is the residential program?',
    answer:
      'Program lengths typically run 30, 60, or 90+ days depending on clinical need — not a fixed insurance window. Forward-Facing Freedom® is designed to build nervous-system capacity before deeper trauma work, which means longer stays are often more effective than shorter ones for clients with complex histories.',
  },
];

export default function WhyFAQ() {
  return (
    <section className="py-24 lg:py-32 bg-white" aria-labelledby="why-faq-heading">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="section-label justify-center mb-5 text-center">Common Questions</p>
        <h2
          id="why-faq-heading"
          className="text-foreground font-bold tracking-tight text-center mb-12"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 3.6vw, 2.8rem)',
            lineHeight: 1.05,
          }}
        >
          Frequently asked questions.
        </h2>
        <div className="rounded-2xl bg-warm-bg border border-black/5 divide-y divide-black/5">
          {faqs.map((f) => (
            <FAQItem key={f.question} question={f.question} answer={f.answer} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-6 py-6 lg:py-7 px-6 lg:px-8 text-left group"
        aria-expanded={open}
      >
        <h3
          className="text-foreground font-bold text-[17px] lg:text-lg leading-snug group-hover:text-primary transition-colors pr-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {question}
        </h3>
        <span
          className={`shrink-0 w-9 h-9 rounded-full bg-white border border-black/5 flex items-center justify-center text-primary transition-all duration-300 ${
            open ? 'rotate-45 bg-primary text-white border-primary' : ''
          }`}
          aria-hidden="true"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
          </svg>
        </span>
      </button>
      <div
        className="overflow-hidden transition-all duration-400 ease-out"
        style={{
          maxHeight: open ? '480px' : '0px',
          opacity: open ? 1 : 0,
        }}
      >
        <div
          className="px-6 lg:px-8 pb-6 lg:pb-7 text-foreground/75 leading-relaxed"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {answer}
        </div>
      </div>
    </div>
  );
}
