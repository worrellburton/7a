'use client';

import { useEffect, useRef, useState } from 'react';

const facts = [
  { term: 'Phone', value: '(866) 996-4308 — answered 24/7 by a compassionate admissions team member' },
  { term: 'Email', value: 'admissions@sevenarrowsrecovery.com — responses within 1 business day' },
  { term: 'Text', value: 'Text (866) 996-4308 if a phone call isn\'t an option right now' },
  { term: 'Average first-call length', value: '15 to 30 minutes — short enough to fit on a lunch break, long enough to get real answers' },
  { term: 'What you need', value: 'Insurance card (if you have one), date of birth, and a quiet place to talk' },
  { term: 'Privacy', value: 'HIPAA-compliant + 42 CFR Part 2. We do not share that you called with anyone.' },
];

export default function ContactAtAGlance() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-20 lg:py-28 bg-warm-bg border-b border-black/5"
      aria-labelledby="contact-at-a-glance-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-12 lg:mb-16"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">At a glance</p>
          <h2
            id="contact-at-a-glance-heading"
            className="text-foreground font-bold tracking-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.85rem, 3.8vw, 2.6rem)',
              lineHeight: 1.05,
            }}
          >
            Six things to know before you call.
          </h2>
        </div>

        <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10 lg:gap-y-12">
          {facts.map((f, i) => (
            <div
              key={f.term}
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(14px)',
                transition: `all 0.85s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.08}s`,
              }}
            >
              <dt
                className="text-[10px] font-semibold tracking-[0.28em] uppercase text-primary mb-3 pb-3 border-b border-primary/25"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {f.term}
              </dt>
              <dd
                className="text-foreground/80 text-[15.5px] leading-relaxed"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
