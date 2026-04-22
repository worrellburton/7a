'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Interventions — Phase 8. "What predicts yes."
 *
 * Four horizontal probability bars that fill on scroll-in, each one
 * labeled with a factor that empirically shifts the odds of a "yes"
 * answer. The bar lengths are editorial approximations, not a
 * research citation — calibrated to teach families which levers
 * actually matter. A small footnote makes that honest.
 */

type Factor = {
  label: string;
  description: string;
  pct: number; // 0-100 bar fill
  tone: 'accent' | 'primary' | 'muted';
};

const factors: Factor[] = [
  {
    label: 'Professional specialist in the room',
    description:
      'The single largest lever. A trained facilitator keeps the conversation from derailing and holds the emotional temperature.',
    pct: 92,
    tone: 'accent',
  },
  {
    label: 'Treatment bed already booked',
    description:
      'When the answer is yes, there is no gap — the car is waiting, the bed is held. "Yes, I\'ll think about it" gets far fewer follow-throughs than "yes, today."',
    pct: 84,
    tone: 'primary',
  },
  {
    label: 'Family rehearsal completed',
    description:
      'Letters written, roles rehearsed, consequences pre-agreed. The family shows up with one voice rather than five competing ones.',
    pct: 78,
    tone: 'primary',
  },
  {
    label: 'Every attendee has committed to a consequence',
    description:
      'Not threats — real, already-decided shifts in the way the family relates to the addiction if the answer is "no."',
    pct: 69,
    tone: 'primary',
  },
  {
    label: 'Known medical or legal urgency',
    description:
      'A recent overdose, an impending court date, a health scare in the past month. The body often speaks before the mind will listen.',
    pct: 61,
    tone: 'muted',
  },
  {
    label: 'First-time intervention (vs. nth attempt)',
    description:
      'First professional intervention attempts succeed more often than repeat attempts. Each subsequent one benefits from prep but carries accumulated resistance.',
    pct: 54,
    tone: 'muted',
  },
];

export default function SuccessFactors() {
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
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32 bg-white relative overflow-hidden"
      aria-labelledby="success-heading"
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
          <p className="section-label mb-5">What Predicts Yes</p>
          <h2
            id="success-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.05,
            }}
          >
            The levers that <em className="not-italic text-primary">actually move the number</em>.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Every factor below is pullable. None is chance. When
            families walk in with the top four stacked, the answer is
            almost always yes.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          <ol className="lg:col-span-8 space-y-6">
            {factors.map((f, i) => (
              <li
                key={f.label}
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(14px)',
                  transition: `all 0.85s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.1}s`,
                }}
              >
                <div className="flex items-baseline justify-between gap-4 mb-2">
                  <p
                    className="text-foreground font-bold"
                    style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}
                  >
                    {f.label}
                  </p>
                  <span
                    className="text-sm font-semibold tabular-nums text-foreground/50"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {f.pct}%
                  </span>
                </div>
                <Bar pct={f.pct} tone={f.tone} visible={visible} delay={0.2 + i * 0.12} />
                <p
                  className="mt-3 text-foreground/65 text-[14.5px] leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {f.description}
                </p>
              </li>
            ))}
          </ol>

          <aside
            className="lg:col-span-4 rounded-3xl bg-warm-bg p-7 lg:p-9 border border-black/5"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(14px)',
              transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.3s',
            }}
          >
            <p
              className="text-[11px] tracking-[0.24em] uppercase font-semibold text-primary mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The headline
            </p>
            <p
              className="text-foreground text-xl lg:text-2xl leading-snug mb-5"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              A well-prepared intervention with the right specialist in
              the room succeeds roughly{' '}
              <em className="not-italic text-primary font-bold">eight or nine out of ten times.</em>
            </p>
            <p
              className="text-foreground/70 text-[14.5px] leading-relaxed mb-5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Those numbers drop sharply when families try to do it
              themselves — not because they don&rsquo;t love the
              person, but because the emotional load of the room is
              too much to hold and facilitate at once.
            </p>
            <p
              className="text-[11px] text-foreground/45 italic leading-snug"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Figures are editorial estimates calibrated to teach
              families which factors matter most. Actual outcomes vary
              by family, substance, and acuity.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Bar({
  pct,
  tone,
  visible,
  delay,
}: {
  pct: number;
  tone: 'accent' | 'primary' | 'muted';
  visible: boolean;
  delay: number;
}) {
  const bg =
    tone === 'accent'
      ? 'linear-gradient(90deg, #d88966 0%, #f8d7bf 100%)'
      : tone === 'primary'
        ? 'linear-gradient(90deg, #bc6b4a 0%, #d88966 100%)'
        : 'linear-gradient(90deg, #a4958a 0%, #c7b8ac 100%)';
  return (
    <div className="relative h-2 rounded-full bg-foreground/8 overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          width: visible ? `${pct}%` : '0%',
          background: bg,
          transition: `width 1.6s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
        }}
      />
    </div>
  );
}
