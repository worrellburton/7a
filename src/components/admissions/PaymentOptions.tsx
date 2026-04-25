'use client';

import { useEffect, useRef, useState } from 'react';

interface Option {
  tag: string;
  title: string;
  body: string;
}

const options: Option[] = [
  {
    tag: 'OON PPO',
    title: 'Out-of-network PPO',
    body:
      'Many PPO plans cover out-of-network residential treatment at a percentage after deductible. We handle the authorization paperwork and file claims on your behalf throughout the stay.',
  },
  {
    tag: 'Private pay',
    title: 'Private pay',
    body:
      'Clients who prefer not to use insurance (privacy, licensure concerns, or out-of-state PPO gaps) can pay privately. Rates are transparent and available on request from admissions.',
  },
  {
    tag: 'Financing',
    title: 'Financing & lending',
    body:
      'We work with third-party medical-lending partners for clients who need to spread cost over time. Prequalification is soft-credit and takes a few minutes during the admissions call.',
  },
  {
    tag: 'Blended',
    title: 'Insurance + private pay',
    body:
      'Many families combine insurance for the medically-necessary portion with private pay for elective extras or extended stays. We build the math with you during the benefits call.',
  },
  {
    tag: 'Advocacy',
    title: 'Appeals & authorization help',
    body:
      'When insurance under-authorizes a stay, our utilization-review team appeals on clinical grounds. We fight for the length of care the clinical evidence supports.',
  },
];

export default function PaymentOptions() {
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

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32 bg-white"
      aria-labelledby="payment-heading"
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
          <p className="section-label mb-5">Paying for treatment</p>
          <h2
            id="payment-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            <em className="not-italic text-primary">More options</em> than you think.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Cost is often the first concern. We walk through the full picture
            &mdash; insurance, appeals, private-pay, and financing &mdash;
            in plain English during your admissions call.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {options.map((o, i) => (
            <article
              key={o.title}
              className="relative rounded-2xl bg-warm-bg border border-black/5 p-7 lg:p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(18px)',
                transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.08}s`,
              }}
            >
              <p
                className="text-[10px] font-semibold tracking-[0.24em] uppercase text-primary mb-3"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {o.tag}
              </p>
              <h3
                className="text-foreground font-bold mb-3"
                style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', lineHeight: 1.15 }}
              >
                {o.title}
              </h3>
              <p
                className="text-foreground/70 leading-relaxed text-[15px]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {o.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
