'use client';

import { useEffect, useRef, useState } from 'react';

interface Window {
  phase: string;
  when: string;
  risk: string;
  body: string;
}

const windows: Window[] = [
  {
    phase: 'The first 48 hours',
    when: 'Discharge day',
    risk: 'Highest acute relapse risk of the year',
    body:
      'Reentry to a physical environment full of old cues. Our aftercare team plans this window deliberately — a prepared landing spot, who meets you, first 48-hour check-in call, and a structured first-day schedule.',
  },
  {
    phase: 'Weeks 1–4',
    when: 'Re-entry',
    risk: 'Sleep, appetite, and motivation all normalize slowly',
    body:
      'Weekly individual sessions with your Seven Arrows clinician continue by phone or video. IOP or outpatient therapy begins. Early sober-community anchoring: meetings, alumni group, accountability partner.',
  },
  {
    phase: 'Days 30–90',
    when: 'The danger zone',
    risk: 'Statistically the hardest window for relapse',
    body:
      'Early optimism fades into real-life stress. We tighten support, not loosen it — weekly check-ins continue, relapse-prevention plan is rehearsed, and trigger-specific coping skills get practiced in session until they are automatic.',
  },
  {
    phase: 'Months 3–12',
    when: 'Consolidation',
    risk: 'Identity rebuild, relationship repair, life design',
    body:
      'Monthly check-ins with your clinician. Quarterly alumni events. Ongoing psychiatric coordination if medications are involved. This is the year recovery becomes a life, not a project.',
  },
];

export default function TheTransition() {
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
      className="py-24 lg:py-32 bg-white"
      aria-labelledby="transition-heading"
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
          <p className="section-label mb-5">The transition</p>
          <h2
            id="transition-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            The first year, <em className="not-italic text-primary">phase by phase</em>.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Research is consistent: the 90 days after residential treatment
            carry the highest relapse risk of any window. Our program is built
            to match the shape of that risk &mdash; not to fade out the moment
            you leave.
          </p>
        </div>

        <ol className="space-y-5 lg:space-y-6">
          {windows.map((w, i) => (
            <li
              key={w.phase}
              className="relative rounded-2xl bg-warm-bg border border-black/5 p-6 lg:p-8"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(18px)',
                transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.1}s`,
              }}
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-8">
                <div className="lg:w-56 shrink-0">
                  <p
                    className="text-[10px] font-semibold tracking-[0.24em] uppercase text-primary mb-2"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {w.when}
                  </p>
                  <h3
                    className="text-foreground font-bold"
                    style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.3rem, 1.9vw, 1.55rem)', lineHeight: 1.1 }}
                  >
                    {w.phase}
                  </h3>
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-foreground/85 font-semibold mb-2 text-[14.5px]"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {w.risk}
                  </p>
                  <p
                    className="text-foreground/70 leading-relaxed"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {w.body}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
