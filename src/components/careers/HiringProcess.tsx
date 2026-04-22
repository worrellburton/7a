'use client';

import { useEffect, useRef, useState } from 'react';

interface Step {
  title: string;
  duration: string;
  body: string;
}

const steps: Step[] = [
  {
    title: 'Send a note',
    duration: 'Day 0',
    body:
      'Email careers@sevenarrowsrecovery.com with a short cover note and a resume. We read every message; you&rsquo;ll hear back in 3 to 5 business days whether we&rsquo;re a likely match.',
  },
  {
    title: 'Screening call',
    duration: 'Week 1',
    body:
      '30-minute phone call with our hiring lead to talk about the role, your background, what you&rsquo;re looking for, and whether Seven Arrows might fit. No pressure, no trick questions.',
  },
  {
    title: 'Campus visit',
    duration: 'Week 2',
    body:
      'For clinical and leadership roles we invite candidates out to the ranch. Tour the property, sit in on a group, share a meal with the team. You&rsquo;ll see the actual job, and we&rsquo;ll see you in context.',
  },
  {
    title: 'Team interview',
    duration: 'Week 2–3',
    body:
      'A longer conversation with 2–3 team members from the role&rsquo;s discipline. Clinical roles include a case discussion; operations roles include a scenario walkthrough. References contacted after this step.',
  },
  {
    title: 'Offer + onboarding',
    duration: 'Week 3–4',
    body:
      'Written offer with compensation, benefits, and start date. Two weeks of structured onboarding on campus — shadowing, training in our modalities, and a primary supervisor assigned from day one.',
  },
];

export default function HiringProcess() {
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
      aria-labelledby="hiring-process-heading"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-16"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">How hiring works</p>
          <h2
            id="hiring-process-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            <em className="not-italic text-primary">Five</em> steps, usually three to four weeks.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            We hire deliberately and answer every applicant. Here&rsquo;s
            what the process actually looks like from submission to start date.
          </p>
        </div>

        <ol className="relative">
          <span
            aria-hidden="true"
            className="absolute left-[22px] sm:left-[30px] top-3 bottom-3 w-px bg-primary/25"
          />
          {steps.map((s, i) => (
            <li
              key={s.title}
              className="relative pl-16 sm:pl-24 pb-12 last:pb-0"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(14px)',
                transition: `all 0.85s cubic-bezier(0.16,1,0.3,1) ${0.2 + i * 0.1}s`,
              }}
            >
              <span
                aria-hidden="true"
                className="absolute left-0 top-0 inline-flex items-center justify-center w-11 h-11 sm:w-[60px] sm:h-[60px] rounded-full bg-white border-2 border-primary/40 text-primary text-sm sm:text-base font-bold shadow-sm"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex items-baseline gap-4 flex-wrap mb-2">
                <h3
                  className="text-foreground font-bold"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.3rem, 1.9vw, 1.55rem)',
                    lineHeight: 1.15,
                  }}
                >
                  {s.title}
                </h3>
                <span
                  className="text-[10px] font-semibold tracking-[0.24em] uppercase text-primary"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {s.duration}
                </span>
              </div>
              <p
                className="text-foreground/70 leading-relaxed max-w-2xl"
                style={{ fontFamily: 'var(--font-body)' }}
                dangerouslySetInnerHTML={{ __html: s.body }}
              />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
