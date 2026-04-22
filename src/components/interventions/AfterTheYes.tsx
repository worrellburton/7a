'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Interventions — Phase 9. "After the yes."
 *
 * The hardest part of an intervention is the 72 hours after "yes."
 * This section lays out the handoff hour-by-hour with a three-column
 * timeline: first 24 hours, first week, first 30 days. A vertical
 * accent line knits the three columns together. Each column is a
 * mini-roadmap; on scroll-in the entries stagger top→bottom.
 */

type Row = { when: string; body: string };

const first24: Row[] = [
  { when: '+0h', body: 'Specialist hands off to the transport driver. Bag, wallet, phone check. Your loved one\'s primary clinician is notified of ETA.' },
  { when: '+2h', body: 'On the road or in the air. Ranch admissions confirms the intake window and readies the room.' },
  { when: '+6h', body: 'Arrival at Seven Arrows. Warm greeting, tour, vitals, medical baseline, first conversation with the primary clinician.' },
  { when: '+12h', body: 'First night on campus. Light dinner, shower, settle in. No programming pressure — rest is the intervention.' },
];

const firstWeek: Row[] = [
  { when: 'Day 2', body: 'Full biopsychosocial assessment, individualized treatment plan drafted with the client\'s input.' },
  { when: 'Days 3–4', body: 'Groups, first equine session, introduction to yoga and breathwork. Structure begins to anchor the nervous system.' },
  { when: 'Day 5', body: 'First family phone call (with ROI in place). Short, supervised, and structured — the interventionist debriefs the family separately.' },
  { when: 'Day 7', body: 'First full week complete. Treatment plan review with the clinical team; family receives a weekly update letter.' },
];

const first30: Row[] = [
  { when: 'Week 2', body: 'Family support sessions begin. Parallel work: your loved one\'s clinical arc, and the family\'s own education groups at home.' },
  { when: 'Week 3', body: 'Deeper work — EMDR, ART, or IFS as clinically indicated. Aftercare planning formally begins.' },
  { when: 'Week 4', body: 'Family weekend option opens. Extended site visit, joint sessions, and time with the horses if the clinical team clears it.' },
  { when: 'Day 30', body: 'Discharge readiness review or continued stay decision. Written aftercare plan in every family member\'s hand.' },
];

export default function AfterTheYes() {
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
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32 bg-warm-bg relative overflow-hidden"
      aria-labelledby="after-heading"
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
          <p className="section-label mb-5">After the Yes</p>
          <h2
            id="after-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.05,
            }}
          >
            The <em className="not-italic text-primary">72 hours</em> that make or break the next thirty days.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Most interventions that come apart come apart in the gap
            between &ldquo;yes&rdquo; and &ldquo;admitted.&rdquo; We
            don&rsquo;t leave that gap open.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 relative">
          {/* Connecting rail behind the three columns on desktop */}
          <div
            aria-hidden="true"
            className="hidden md:block absolute left-0 right-0 top-[44px] h-px bg-primary/20"
          />
          <Column
            label="First 24 hours"
            tag="Handoff"
            rows={first24}
            visible={visible}
            delay={0.15}
          />
          <Column
            label="First week"
            tag="Anchor"
            rows={firstWeek}
            visible={visible}
            delay={0.3}
          />
          <Column
            label="First 30 days"
            tag="Deeper work"
            rows={first30}
            visible={visible}
            delay={0.45}
          />
        </div>
      </div>
    </section>
  );
}

function Column({
  label,
  tag,
  rows,
  visible,
  delay,
}: {
  label: string;
  tag: string;
  rows: Row[];
  visible: boolean;
  delay: number;
}) {
  return (
    <div
      className="relative"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(18px)',
        transition: `all 0.95s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      {/* Column marker sits on the connecting rail */}
      <div className="flex items-center gap-3 mb-6">
        <span className="relative w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
          <span className="relative w-2 h-2 rounded-full bg-white" />
        </span>
        <div>
          <p
            className="text-[11px] tracking-[0.22em] uppercase font-semibold text-primary"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {tag}
          </p>
          <p
            className="text-foreground font-bold"
            style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}
          >
            {label}
          </p>
        </div>
      </div>

      <ol className="rounded-2xl bg-white border border-black/5 p-5 lg:p-6 space-y-4">
        {rows.map((r) => (
          <li key={r.when} className="flex items-start gap-3">
            <span
              className="shrink-0 w-14 text-[11px] font-bold tracking-[0.12em] uppercase text-primary pt-0.5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {r.when}
            </span>
            <p
              className="text-foreground/75 text-[14px] leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {r.body}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
