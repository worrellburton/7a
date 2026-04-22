'use client';

import { useState } from 'react';

/** Phase 9 — residential-specific FAQ. */

const faqs = [
  {
    question: 'How long does residential inpatient typically last?',
    answer:
      'Most clients stay 30, 60, or 90+ days depending on clinical need and insurance authorization. Longer stays are frequently more effective for clients with complex trauma or high-severity addiction, and our Forward-Facing Freedom® model is designed around the actual timeline of nervous-system healing rather than a fixed insurance window.',
  },
  {
    question: 'Is medical detox handled on-site?',
    answer:
      'Yes. We provide medically supervised detox on-site with 24/7 clinical oversight, so you stay in one place with one team from day one. You never have to hand off to an outside detox facility and hope for continuity — the clinicians who detox you are the clinicians who treat you.',
  },
  {
    question: 'Can family members visit during residential care?',
    answer:
      'Family engagement is a core part of our program. After an initial stabilization period, we schedule structured family support sessions and organize family program weekends where loved ones can participate in psychoeducation, group work, and in-person visits. Visitation policies are tailored per client by the clinical team.',
  },
  {
    question: 'What about phones, laptops, and work commitments?',
    answer:
      'Clients typically surrender personal phones and laptops during the first stabilization window so the nervous system can genuinely rest. As stays progress, device access is reintroduced in a structured way. For clients with unavoidable work commitments, we accommodate scheduled check-ins — but we strongly encourage the full digital pause.',
  },
  {
    question: 'Can I continue my psychiatric medications?',
    answer:
      'Yes. Our medical team coordinates with your existing prescribers on arrival and manages all psychiatric medications throughout your stay. Most clients continue their current regimen while the team assesses whether adjustments are clinically indicated — never an abrupt stop.',
  },
];

export default function ResidentialFAQ() {
  return (
    <section className="py-24 lg:py-32 bg-white" aria-labelledby="res-faq-heading">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="section-label justify-center mb-5 text-center">Common Questions</p>
        <h2
          id="res-faq-heading"
          className="text-foreground font-bold tracking-tight text-center mb-12"
          style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3.6vw, 2.8rem)', lineHeight: 1.05 }}
        >
          What families ask most often.
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
        style={{ maxHeight: open ? '560px' : '0px', opacity: open ? 1 : 0 }}
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
