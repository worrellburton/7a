'use client';

import { useEffect, useRef, useState } from 'react';

interface Benefit {
  tag: string;
  title: string;
  body: string;
}

const benefits: Benefit[] = [
  { tag: 'Signature', title: 'Paid FFTA training', body: 'Every staff member is paid to train in the Forward-Facing TraumAddiction Model (FFTA) — we are the only residential program in the world offering it right now.' },
  { tag: 'Health', title: 'Medical, dental, vision', body: 'Comprehensive coverage begins two months after hire. Low-premium options available.' },
  { tag: 'Time off', title: 'PTO + sick time', body: 'Generous PTO that accrues from day one, plus a separate sick-time bank.' },
  { tag: 'Licensure', title: 'Licensure supervision', body: 'Clinical supervision toward independent licensure available on-site for associate-level clinicians on staff.' },
  { tag: 'Development', title: 'CEU stipend', body: 'Annual CEU budget for license renewal plus on-site trainings built into the week.' },
  { tag: 'Meals', title: 'Meals on campus', body: 'Whole-food meals prepared on-site, included during shift. Kitchen accommodates dietary restrictions.' },
  { tag: 'Setting', title: 'The ranch', body: '160 acres of open Arizona sky, working horses, and quiet porches — the kind of worksite that changes how a week feels.' },
  { tag: 'Interns', title: 'Internship pathways', body: 'We are actively building out internship roles — masters-level clinical, holistic, and admissions tracks. Reach out if you are mid-program.' },
];

export default function Benefits() {
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
      className="relative py-24 lg:py-32 bg-dark-section text-white overflow-hidden"
      aria-labelledby="benefits-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 45% at 85% 15%, rgba(216,137,102,0.18) 0%, rgba(216,137,102,0) 65%), radial-gradient(ellipse 50% 50% at 10% 85%, rgba(107,42,20,0.28) 0%, rgba(107,42,20,0) 65%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-18"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-accent mb-5" style={{ fontFamily: 'var(--font-body)' }}>
            Benefits &amp; perks
          </p>
          <h2
            id="benefits-heading"
            className="font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            <em className="not-italic" style={{ color: 'var(--color-accent)' }}>Actual</em> support, not perks theater.
          </h2>
          <p className="text-white/75 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            The benefits that matter: health coverage, retirement, time off,
            training, licensure support, and wellness you can actually use during
            the workday.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {benefits.map((b, i) => (
            <article
              key={b.title}
              className="relative rounded-2xl p-6 lg:p-7 bg-white/[0.04] border border-white/10 hover:border-white/25 hover:bg-white/[0.07] transition-all duration-300"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(18px)',
                transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.06}s`,
              }}
            >
              <p
                className="text-[10px] font-semibold tracking-[0.24em] uppercase text-accent/85 mb-3"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {b.tag}
              </p>
              <h3
                className="font-bold mb-3"
                style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', lineHeight: 1.15 }}
              >
                {b.title}
              </h3>
              <p
                className="text-white/70 leading-relaxed text-[14px]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {b.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
