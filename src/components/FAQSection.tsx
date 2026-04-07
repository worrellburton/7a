'use client';


import { useState } from 'react';

const BRANDFETCH_CLIENT_ID = '1id3n10pdBTarCHI0db';

const insuranceLogos = [
  { name: 'Aetna', domain: 'aetna.com' },
  { name: 'Blue Cross Blue Shield', domain: 'bcbs.com' },
  { name: 'Cigna', domain: 'cigna.com' },
  { name: 'Humana', domain: 'humana.com' },
  { name: 'UnitedHealthcare', domain: 'uhc.com' },
  { name: 'TRICARE', domain: 'tricare.mil' },
];

const INSURANCE_FAQ_INDEX = 1;

const faqs = [
  {
    question: 'What types of addiction does Seven Arrows Recovery treat?',
    answer:
      'Seven Arrows Recovery treats alcohol addiction, drug addiction (including opioids, methamphetamine, cocaine, and prescription drugs), dual diagnosis (co-occurring mental health and substance use disorders), and trauma-related conditions through our proprietary TraumAddiction\u2122 approach.',
  },
  {
    question: 'Does Seven Arrows accept insurance?',
    answer:
      'Yes, Seven Arrows Recovery accepts most major insurance plans including Aetna, Blue Cross Blue Shield, Cigna, Humana, UnitedHealthcare, and TRICARE. We offer free insurance verification\u2014our admissions team can check your benefits within 15 minutes.',
  },
  {
    question: 'How long is the treatment program?',
    answer:
      'Treatment length is individualized based on each person\u2019s needs. Residential programs typically range from 30 to 90 days. Our clinical team works with you to determine the right duration for lasting recovery.',
  },
  {
    question: 'What makes Seven Arrows different from other rehab centers?',
    answer:
      'Seven Arrows Recovery is a boutique facility with small group sizes, nestled at the base of the Swisshelm Mountains in Arizona. We offer a unique combination of evidence-based clinical treatment, holistic therapies, and our specialty TraumAddiction\u2122 approach that addresses trauma and addiction simultaneously.',
  },
  {
    question: 'Is my information kept confidential?',
    answer:
      'Absolutely. Seven Arrows Recovery is fully HIPAA compliant. All patient information is protected by federal law. Your privacy is our priority throughout the admissions process and treatment.',
  },
  {
    question: 'What should I expect during the admissions process?',
    answer:
      'The admissions process is simple and compassionate. Call us at (866) 996-4308 or fill out our contact form. We\u2019ll verify your insurance, discuss your situation, and guide you through every step. Many clients begin treatment within 24\u201348 hours of their first call.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-20 lg:py-28 bg-white" aria-labelledby="faq-heading">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="section-label justify-center mb-3">Common Questions</p>
          <h2 id="faq-heading" className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3" role="list">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-gray-100 rounded-xl overflow-hidden"
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
                  {index === INSURANCE_FAQ_INDEX && (
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
