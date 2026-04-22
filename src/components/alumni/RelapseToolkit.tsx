'use client';

import { useEffect, useRef, useState } from 'react';

interface Tool {
  title: string;
  when: string;
  body: string;
}

const tools: Tool[] = [
  {
    title: 'Named triggers list',
    when: 'Built in treatment · refined in aftercare',
    body: 'Your specific triggers — people, places, times of day, internal states — with a 1-to-10 intensity rating and a matched coping strategy beside each. Not generic "H.A.L.T." — your actual list.',
  },
  {
    title: 'Early-warning signs checklist',
    when: 'Reviewed weekly the first 90 days',
    body: 'The behavioral and emotional signals that typically precede a lapse for you. Sleep, isolation, resentments, secrets — all named, so you can catch them before they compound.',
  },
  {
    title: 'Urge-surfing + distress-tolerance skills',
    when: 'Deployed in the moment',
    body: 'Skills practiced to automaticity during your stay — physiological sighs, TIPP, 5-4-3-2-1 grounding, body-scan. Not things you learn in crisis; things your nervous system already knows when crisis arrives.',
  },
  {
    title: 'Emergency contact plan',
    when: 'Always on your phone',
    body: 'A ranked list: primary clinician, Seven Arrows alumni line, sponsor or peer, trusted family. Sequence and when to call each one. When you\'re in it, you don\'t have to decide — you just call the next name.',
  },
  {
    title: 'Medication-assisted treatment coordination',
    when: 'Ongoing as indicated',
    body: 'If MAT (buprenorphine, naltrexone) is part of your plan, we coordinate prescribing continuity and ensure adherence support is baked into aftercare — not an afterthought.',
  },
  {
    title: '"If I slip" plan',
    when: 'Written before you need it',
    body: 'A pre-agreed, written plan for what you will do if you have a lapse. Who to call first, what to do with the substance, what the next 24 hours look like. Designed to prevent a slip from becoming a relapse.',
  },
];

export default function RelapseToolkit() {
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
      aria-labelledby="relapse-toolkit-heading"
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
          <p className="section-label mb-5">Relapse prevention</p>
          <h2
            id="relapse-toolkit-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            A toolkit you <em className="not-italic text-primary">already know how to use</em>.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Relapse is not a sign of failure — it&rsquo;s a signal that the
            plan needs adjustment. Six tools built during your stay and
            rehearsed in aftercare so they&rsquo;re there when you need them.
          </p>
        </div>

        <ol className="space-y-5 lg:space-y-6">
          {tools.map((t, i) => (
            <li
              key={t.title}
              className="relative rounded-2xl bg-warm-bg border border-black/5 p-6 lg:p-7"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(16px)',
                transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.08}s`,
              }}
            >
              <div className="flex items-start gap-5">
                <span
                  aria-hidden="true"
                  className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border-2 border-primary/40 text-primary text-[12px] font-bold"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3 flex-wrap mb-2">
                    <h3
                      className="text-foreground font-bold"
                      style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.2rem, 1.75vw, 1.45rem)', lineHeight: 1.15 }}
                    >
                      {t.title}
                    </h3>
                    <span
                      className="text-[10px] font-semibold tracking-[0.22em] uppercase text-primary"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {t.when}
                    </span>
                  </div>
                  <p
                    className="text-foreground/70 leading-relaxed"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {t.body}
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
