'use client';

import { useState } from 'react';

const faqs = [
  {
    question: 'Does Seven Arrows Recovery accept insurance?',
    answer:
      'Yes. We work with most major insurance providers and our admissions team will verify your benefits before you arrive. We also offer private pay options and can discuss financing if needed. Call us at (866) 996-4308 for a free, confidential insurance verification.',
  },
  {
    question: 'How long does treatment last?',
    answer:
      'Our residential inpatient program typically ranges from 30 to 90 days, depending on individual clinical needs. Length of stay is determined collaboratively between the client, their family, and our clinical team. We believe in providing enough time for meaningful, lasting change rather than rushing the process.',
  },
  {
    question: 'What should I bring to treatment?',
    answer:
      'We recommend bringing comfortable clothing suitable for the Arizona climate, personal hygiene items, any prescribed medications in their original containers, a journal, and a list of emergency contacts. We will provide a detailed packing list upon admission. Electronics are limited to support a distraction-free healing environment.',
  },
  {
    question: 'Can my family be involved in my treatment?',
    answer:
      'Absolutely. Family involvement is a core part of our program. We offer weekly family therapy sessions, a dedicated Family Program with educational workshops, and structured family visitation. We believe that healing the family system is essential to sustaining long-term recovery.',
  },
  {
    question: 'What types of addiction do you treat?',
    answer:
      'Seven Arrows Recovery treats a wide range of substance use disorders including alcohol addiction, opioid and heroin addiction, prescription drug dependency, methamphetamine and stimulant abuse, benzodiazepine dependency, and co-occurring mental health disorders (dual diagnosis).',
  },
  {
    question: 'What is the TraumAddiction\u2122 approach?',
    answer:
      'TraumAddiction\u2122 is our proprietary clinical framework that recognizes the deep connection between unresolved trauma and addictive behavior. It integrates body-based interventions like somatic experiencing and EMDR with traditional psychotherapy to treat the root causes of addiction, not just the symptoms.',
  },
  {
    question: 'What does a typical day look like?',
    answer:
      'Each day includes a structured blend of clinical therapy (individual and group sessions), holistic activities (yoga, meditation, equine therapy), wellness time (fitness, nutrition), and community connection (shared meals, peer support meetings). Evenings include reflection time and 12-step or support group meetings.',
  },
  {
    question: 'How do I get started with admissions?',
    answer:
      'Getting started is simple. Call our admissions line at (866) 996-4308 or fill out our online contact form. Our team will conduct a confidential assessment, verify your insurance, and help coordinate travel to our facility in southeastern Arizona. Many clients are admitted within 24 to 48 hours of their first call.',
  },
  {
    question: 'Is detox available on-site?',
    answer:
      'Yes. We offer medically supervised detoxification on-site with 24/7 medical oversight. Our medical team ensures that the withdrawal process is as safe and comfortable as possible, using evidence-based protocols and medication-assisted treatment when clinically appropriate.',
  },
  {
    question: 'What happens after I complete treatment?',
    answer:
      'Before discharge, our clinical team works with you to develop a comprehensive aftercare plan. This may include outpatient therapy referrals, sober living recommendations, alumni support groups, ongoing family therapy, and relapse prevention strategies. We remain a resource long after you leave our campus.',
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-foreground/10 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-6 text-left group"
        aria-expanded={isOpen}
      >
        <h3 className="text-lg font-bold text-foreground pr-8 group-hover:text-primary transition-colors">
          {question}
        </h3>
        <span
          className={`shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary transition-transform duration-300 ${
            isOpen ? 'rotate-45' : ''
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-96 pb-6' : 'max-h-0'
        }`}
      >
        <p
          className="text-foreground/70 leading-relaxed"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {answer}
        </p>
      </div>
    </div>
  );
}

export default function FAQAccordion() {
  return (
    <div className="bg-warm-bg rounded-2xl p-8 lg:p-12">
      {faqs.map((faq) => (
        <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
      ))}
    </div>
  );
}
