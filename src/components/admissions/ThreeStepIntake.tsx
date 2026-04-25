'use client';

import { useEffect, useRef, useState } from 'react';

interface Step {
  title: string;
  duration: string;
  body: string;
}

const steps: Step[] = [
  {
    title: 'Start with a call',
    duration: 'Minutes',
    body:
      'Dial (866) 996-4308 or submit the insurance form. Our admissions coordinator listens first, then asks a few questions to understand who you are calling for, what substance or substances, and what the urgency looks like. No script, no sales pitch.',
  },
  {
    title: 'Clinical phone assessment',
    duration: '20–30 min',
    body:
      'A brief clinical screen covering substance-use history, mental-health history, medications, and recent detox needs. Our clinical and medical directors review the screen; together we decide whether Seven Arrows is the right fit.',
  },
  {
    title: 'Arrive at the ranch',
    duration: '24–48 hours',
    body:
      'Once approved, we coordinate insurance authorization, travel (flight, airport pickup, or sober transport), and — if acute detox is needed first — a partner detox stay. Most clients land on campus within two days of their first call.',
  },
];

export default function ThreeStepIntake() {
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
      aria-labelledby="three-step-intake-heading"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-18"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">How it works</p>
          <h2
            id="three-step-intake-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Three steps from first call to <em className="not-italic text-primary">first day</em>.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            We&rsquo;ve been doing this long enough that the process is
            simple. You call, we listen and verify, and you arrive.
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
                transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.2 + i * 0.12}s`,
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
                    fontSize: 'clamp(1.3rem, 1.95vw, 1.65rem)',
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
              >
                {s.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
