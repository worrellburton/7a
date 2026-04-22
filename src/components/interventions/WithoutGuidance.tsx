'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Interventions — Phase 3. "Without guidance."
 *
 * A two-column failure-mode vs. guided-mode composition. Each mode is
 * a small animated SVG: on the left, a tangled, splintering set of
 * lines that end in scattered dots; on the right, three converging
 * lines that resolve into a single destination node. Both draw in on
 * scroll. Editorial copy sits above the diagram, not below, so the
 * visual does the heavy lifting.
 */
export default function WithoutGuidance() {
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
      { threshold: 0.25, rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32 bg-white relative overflow-hidden"
      aria-labelledby="without-heading"
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
          <p className="section-label mb-5">Two Paths</p>
          <h2
            id="without-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.05,
            }}
          >
            The same conversation, held two{' '}
            <em className="not-italic text-primary">very different</em> ways.
          </h2>
          <p
            className="text-foreground/75 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Every family who loves someone in active addiction has tried
            to talk about it. Without a trained professional in the
            room, the talk has a way of fragmenting. With one, the same
            words land completely differently.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
          <Panel
            visible={visible}
            delay={0.2}
            tone="alert"
            eyebrow="Without an interventionist"
            title="The conversation splinters."
            body="Old grievances surface. Shame takes over. The room gets loud, the doors close, and the person you love leaves more defended than they arrived. Nothing changes — except trust, which gets smaller."
            svg={<TangledSvg visible={visible} />}
            tags={[
              'Loud-quiet-loud cycle',
              'Side-taking / triangulation',
              'Empty threats',
              'Walked out',
            ]}
          />
          <Panel
            visible={visible}
            delay={0.4}
            tone="primary"
            eyebrow="With a trained specialist"
            title="The conversation holds."
            body="Each person says exactly what they prepared. The specialist keeps the room from overheating and holds the thread. When your loved one answers, the next step is already booked — a bed, a car, a clinician ready at the ranch."
            svg={<ConvergingSvg visible={visible} />}
            tags={[
              'One agenda',
              'Pre-rehearsed letters',
              'Structured pauses',
              'Immediate transport',
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function Panel({
  visible,
  delay,
  tone,
  eyebrow,
  title,
  body,
  svg,
  tags,
}: {
  visible: boolean;
  delay: number;
  tone: 'alert' | 'primary';
  eyebrow: string;
  title: string;
  body: string;
  svg: React.ReactNode;
  tags: string[];
}) {
  const palette =
    tone === 'alert'
      ? { chip: 'bg-red-50 text-red-700 border-red-100', accent: 'text-red-700' }
      : { chip: 'bg-primary/10 text-primary border-primary/20', accent: 'text-primary' };

  return (
    <article
      className="rounded-3xl bg-warm-bg p-7 lg:p-10 border border-black/5"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(22px)',
        transition: `all 0.95s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      <p
        className={`text-[11px] tracking-[0.24em] uppercase font-semibold mb-3 ${palette.accent}`}
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {eyebrow}
      </p>
      <h3
        className="text-foreground font-bold mb-4"
        style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 2.1vw, 1.8rem)', lineHeight: 1.1 }}
      >
        {title}
      </h3>
      <p
        className="text-foreground/75 leading-relaxed mb-7"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {body}
      </p>

      <div className="rounded-2xl bg-white border border-black/5 p-4 mb-6">{svg}</div>

      <ul className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <li
            key={t}
            className={`text-[11px] font-semibold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border ${palette.chip}`}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {t}
          </li>
        ))}
      </ul>
    </article>
  );
}

function TangledSvg({ visible }: { visible: boolean }) {
  return (
    <svg viewBox="0 0 320 160" className="w-full h-40" aria-hidden="true">
      <g stroke="#b45a39" fill="none" strokeWidth="1.8" strokeLinecap="round">
        {[
          'M 20 80 C 70 20, 120 140, 180 60 S 260 130, 300 40',
          'M 20 80 C 60 140, 140 40, 200 120 S 270 30, 300 110',
          'M 20 80 C 80 70, 130 30, 190 100 S 250 150, 300 70',
          'M 20 80 C 100 120, 150 70, 210 40 S 270 100, 300 130',
        ].map((d, i) => (
          <path
            key={i}
            d={d}
            opacity={0.4 + i * 0.1}
            style={{
              strokeDasharray: 600,
              strokeDashoffset: visible ? 0 : 600,
              transition: `stroke-dashoffset 1.8s cubic-bezier(0.22,1,0.36,1) ${0.2 + i * 0.12}s`,
            }}
          />
        ))}
      </g>
      {/* Endpoints scatter */}
      <g fill="#6b2a14">
        {[
          [300, 40],
          [300, 110],
          [300, 70],
          [300, 130],
        ].map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="4"
            style={{
              opacity: visible ? 1 : 0,
              transition: `opacity 0.5s ease ${1.6 + i * 0.1}s`,
            }}
          />
        ))}
      </g>
      <circle cx="20" cy="80" r="6" fill="#14100a" />
    </svg>
  );
}

function ConvergingSvg({ visible }: { visible: boolean }) {
  return (
    <svg viewBox="0 0 320 160" className="w-full h-40" aria-hidden="true">
      <defs>
        <linearGradient id="wg-conv" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#d88966" />
          <stop offset="100%" stopColor="#2f6f5e" />
        </linearGradient>
      </defs>
      <g stroke="url(#wg-conv)" fill="none" strokeWidth="2" strokeLinecap="round">
        {[
          'M 20 40 C 110 50, 180 80, 270 80',
          'M 20 80 C 110 80, 180 80, 270 80',
          'M 20 120 C 110 110, 180 80, 270 80',
        ].map((d, i) => (
          <path
            key={i}
            d={d}
            style={{
              strokeDasharray: 400,
              strokeDashoffset: visible ? 0 : 400,
              transition: `stroke-dashoffset 1.6s cubic-bezier(0.22,1,0.36,1) ${0.2 + i * 0.15}s`,
            }}
          />
        ))}
      </g>
      <g fill="#14100a">
        <circle cx="20" cy="40" r="5" />
        <circle cx="20" cy="80" r="5" />
        <circle cx="20" cy="120" r="5" />
      </g>
      <circle
        cx="270"
        cy="80"
        r="12"
        fill="#d88966"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.5)',
          transformOrigin: '270px 80px',
          transition: 'all 0.7s cubic-bezier(0.16,1,0.3,1) 1.6s',
        }}
      />
      <circle cx="270" cy="80" r="5" fill="#fff" />
      <text
        x="270"
        y="110"
        textAnchor="middle"
        fontFamily="var(--font-body)"
        fontSize="10"
        fontWeight="600"
        fill="#14100a88"
        letterSpacing="1.5"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.5s ease 2s',
        }}
      >
        ADMISSION
      </text>
    </svg>
  );
}
