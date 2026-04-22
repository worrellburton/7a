'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Interventions — Phase 5. "The process."
 *
 * Horizontal 5-step progress rail on desktop, vertical stepper on
 * mobile. A gradient line paints from left-to-right (or top-to-bottom)
 * on scroll-in; each step node glows on arrival; copy below each step
 * reveals with a stagger. Intentionally dense but very readable —
 * this is the section families print out and share.
 */

type Step = {
  n: string;
  title: string;
  tag: string;
  body: string;
  Icon: (p: { className?: string }) => React.ReactElement;
};

const steps: Step[] = [
  {
    n: '01',
    title: 'Private call',
    tag: 'Day 1 · 60 minutes',
    body: 'You tell one person — the interventionist — the whole story. No forms, no paperwork yet. We listen, ask targeted questions, and decide together whether an intervention is the right move or whether a softer option fits.',
    Icon: PhoneIcon,
  },
  {
    n: '02',
    title: 'Family prep',
    tag: 'Days 2–4',
    body: 'We work with the people you want in the room. Roles are assigned, impact statements are written, boundaries are defined, and the room\'s emotional temperature is carefully tuned. Nobody walks in unrehearsed.',
    Icon: BookIcon,
  },
  {
    n: '03',
    title: 'Dress rehearsal',
    tag: 'Day before',
    body: 'Full run-through of the conversation without your loved one. Letters are read aloud. The specialist redirects anything that could derail the room. By the end, the family feels ready — most say relieved.',
    Icon: ClipIcon,
  },
  {
    n: '04',
    title: 'The intervention',
    tag: 'Day of · 90 minutes avg.',
    body: 'The specialist opens, each person speaks in the rehearsed order, and a clear treatment offer is presented. If your loved one agrees, the transport vehicle and bed at the ranch are already in place.',
    Icon: GatherIcon,
  },
  {
    n: '05',
    title: 'Transition to care',
    tag: 'Same day',
    body: 'We coordinate the drive (or flight) to Seven Arrows. The family walks away with a written 30-60-90-day support plan. Whether your loved one said yes or not-yet, the family has a structure for what comes next.',
    Icon: RoadIcon,
  },
];

export default function TheProcess() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es)
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32 bg-white relative overflow-hidden"
      aria-labelledby="process-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-20"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">The Process</p>
          <h2
            id="process-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.05,
            }}
          >
            Five steps from first call to <em className="not-italic text-primary">first day of care</em>.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            We can compress the entire arc into as little as 72 hours
            when the situation is urgent. When time allows, we&rsquo;d
            rather take a week and do it right.
          </p>
        </div>

        {/* Desktop horizontal stepper */}
        <div className="hidden lg:block relative">
          <div className="absolute left-0 right-0 top-[38px] h-px bg-black/10" aria-hidden="true" />
          <div
            className="absolute left-0 top-[38px] h-px"
            aria-hidden="true"
            style={{
              background:
                'linear-gradient(90deg, var(--color-primary-dark) 0%, var(--color-accent) 50%, var(--color-primary-dark) 100%)',
              width: visible ? '100%' : '0%',
              transition: 'width 2.4s cubic-bezier(0.22,1,0.36,1) 0.3s',
            }}
          />

          <div className="grid grid-cols-5 gap-5">
            {steps.map((s, i) => {
              const Icon = s.Icon;
              return (
                <div
                  key={s.n}
                  className="relative pt-20"
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(22px)',
                    transition: `all 0.95s cubic-bezier(0.16,1,0.3,1) ${0.4 + i * 0.14}s`,
                  }}
                >
                  <div
                    className="absolute left-0 top-4 w-10 h-10 rounded-full flex items-center justify-center shadow-md"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      boxShadow: '0 0 0 5px rgba(188,107,74,0.14)',
                    }}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p
                    className="text-[11px] font-semibold tracking-[0.22em] uppercase text-primary mb-1"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Step {s.n}
                  </p>
                  <h3
                    className="text-foreground font-bold mb-1"
                    style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', lineHeight: 1.15 }}
                  >
                    {s.title}
                  </h3>
                  <p className="text-accent italic mb-3 text-[13px]" style={{ fontFamily: 'var(--font-display)' }}>
                    {s.tag}
                  </p>
                  <p
                    className="text-foreground/70 text-[14px] leading-relaxed"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {s.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile vertical stepper */}
        <div className="lg:hidden relative pl-7">
          <div className="absolute left-[11px] top-4 bottom-4 w-px bg-black/10" aria-hidden="true" />
          <div
            className="absolute left-[11px] top-4 w-px"
            aria-hidden="true"
            style={{
              background:
                'linear-gradient(180deg, var(--color-primary-dark) 0%, var(--color-accent) 60%, var(--color-primary-dark) 100%)',
              height: visible ? 'calc(100% - 2rem)' : '0%',
              transition: 'height 2.4s cubic-bezier(0.22,1,0.36,1) 0.2s',
            }}
          />
          <div className="space-y-10">
            {steps.map((s, i) => {
              const Icon = s.Icon;
              return (
                <article
                  key={s.n}
                  className="relative"
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateX(0)' : 'translateX(-8px)',
                    transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.14}s`,
                  }}
                >
                  <span
                    className="absolute -left-[30px] top-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <Icon className="w-3 h-3 text-white" />
                  </span>
                  <p
                    className="text-[10px] font-semibold tracking-[0.22em] uppercase text-primary mb-1"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Step {s.n}
                  </p>
                  <h3
                    className="text-foreground font-bold mb-1"
                    style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}
                  >
                    {s.title}
                  </h3>
                  <p className="text-accent italic mb-2 text-[13px]" style={{ fontFamily: 'var(--font-display)' }}>
                    {s.tag}
                  </p>
                  <p
                    className="text-foreground/70 text-[14px] leading-relaxed"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {s.body}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.37 1.9.72 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0122 16.92z" />
    </svg>
  );
}
function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6a2 2 0 012-2h13v16H6a2 2 0 01-2-2V6z" />
      <path d="M8 8h8M8 12h6" />
    </svg>
  );
}
function ClipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4h6v3H9z" />
      <path d="M9 11h6M9 15h4" />
    </svg>
  );
}
function GatherIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="9" r="2.5" />
      <circle cx="16" cy="9" r="2.5" />
      <circle cx="12" cy="15" r="2.5" />
      <path d="M5 20c0-2 2-4 5-4s5 2 5 4M13 20c0-2 2-4 5-4" />
    </svg>
  );
}
function RoadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 21l3-16M17 21l-3-16" />
      <path d="M12 7v2M12 13v2" />
    </svg>
  );
}
