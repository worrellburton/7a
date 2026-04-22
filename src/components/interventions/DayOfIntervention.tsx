'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Interventions — Phase 7. "Day of the intervention."
 *
 * Hour-by-hour ribbon. Top: an animated clock-face SVG where a single
 * accent arc sweeps from 6:00 through 3:00 on scroll-in, marking the
 * window of the day we typically hold. Below: six time-stamped cards
 * (arrival, family gather, the ask, the answer, the drive, nightfall)
 * stagger in underneath. Intentionally specific so families can
 * picture the day before it happens.
 */

type Beat = {
  time: string;
  title: string;
  body: string;
};

const beats: Beat[] = [
  {
    time: '6:30 am',
    title: 'Family gathers without them.',
    body: 'Quiet room. Coffee. The specialist does a final letter review, walks through who sits where, and confirms the exit plan. Phones on silent, off the table.',
  },
  {
    time: '8:15 am',
    title: 'The call to come in.',
    body: 'One trusted person — parent, sibling, spouse, boss — calls your loved one in. No disclosure of what the meeting is. No elaborate story, just "I need you here, we need to talk."',
  },
  {
    time: '8:45 am',
    title: 'They walk in.',
    body: 'The specialist greets them first, names what is happening, and reassures them they can leave at any moment. Almost no one leaves — because the room is safer than they expect.',
  },
  {
    time: '9:00 am',
    title: 'Letters are read.',
    body: 'Each family member reads their prepared letter in the rehearsed order. Specific. Warm. Bounded. The specialist intervenes only if the temperature of the room needs to be corrected.',
  },
  {
    time: '10:15 am',
    title: 'The offer.',
    body: 'A clear, already-arranged treatment plan is put in front of them. Not hypothetical — a bed is held at the ranch, a car is in the driveway, a bag is packed in the trunk.',
  },
  {
    time: '10:30 am',
    title: 'The answer.',
    body: 'Most often: yes, today. Sometimes: yes, tomorrow. Occasionally: not yet. The family knows in advance which consequences follow each answer, so whatever comes next is already mapped.',
  },
  {
    time: '11:00 am',
    title: 'The drive.',
    body: 'If yes, transport begins immediately — with a specialist or trusted family member riding along. By dinnertime your loved one is on the ranch with their primary clinician.',
  },
  {
    time: 'Nightfall',
    title: 'The family debriefs.',
    body: 'The specialist meets with the family one more time that evening — on video if needed — to walk through the 72-hour, 30-day, 90-day follow-on plan. Nobody is sent home empty-handed.',
  },
];

export default function DayOfIntervention() {
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
      className="py-24 lg:py-32 bg-dark-section text-white relative overflow-hidden"
      aria-labelledby="day-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 60% at 80% 20%, rgba(216,137,102,0.2) 0%, rgba(216,137,102,0) 70%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start mb-14 lg:mb-20">
          <div
            className="lg:col-span-7"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(14px)',
              transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
            }}
          >
            <p
              className="text-[11px] tracking-[0.24em] uppercase font-semibold text-accent mb-5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Day of the intervention
            </p>
            <h2
              id="day-heading"
              className="font-bold tracking-tight mb-5"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 4.2vw, 3rem)',
                lineHeight: 1.05,
              }}
            >
              What the day <em className="not-italic text-accent">actually looks like</em>.
            </h2>
            <p
              className="text-white/75 text-lg leading-relaxed max-w-xl"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Families who have never been through an intervention tend
              to imagine something dramatic. The real day is quieter,
              more structured, and shorter than most expect. This is
              the rhythm we&rsquo;ve refined across hundreds of them.
            </p>
          </div>

          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <ClockArc visible={visible} />
          </div>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5">
          {beats.map((b, i) => (
            <article
              key={b.time}
              className="rounded-2xl bg-white/5 border border-white/10 p-5 lg:p-6 backdrop-blur-sm hover:bg-white/8 transition-colors"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(22px)',
                transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.2 + i * 0.08}s`,
              }}
            >
              <p
                className="text-[11px] tracking-[0.2em] uppercase font-bold text-accent mb-2"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {b.time}
              </p>
              <h3
                className="text-white font-bold mb-2"
                style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', lineHeight: 1.15 }}
              >
                {b.title}
              </h3>
              <p
                className="text-white/65 text-[13.5px] leading-relaxed"
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

/** A 220px clock face with a sweeping arc that paints 6am→11am on
 *  scroll-in, with small hour ticks and an accent dot riding the end
 *  of the arc. */
function ClockArc({ visible }: { visible: boolean }) {
  // Arc parameters: the circle is centered at (100,100) with radius 80.
  // We describe an arc from 6:00 (bottom, angle 90deg) counter-clockwise
  // around through 11:00 (top-left, angle ~330deg = -30deg) — total sweep
  // ≈ 150 degrees clockwise.
  const size = 220;
  const center = size / 2;
  const r = 80;
  // Convert clock hour to SVG coords (0:00 straight up → -90deg).
  const hourPoint = (h: number) => {
    const deg = (h / 12) * 360 - 90;
    const rad = (deg * Math.PI) / 180;
    return [center + r * Math.cos(rad), center + r * Math.sin(rad)];
  };
  const [sx, sy] = hourPoint(6.5); // start ~ 6:30
  const [ex, ey] = hourPoint(11);  // end ~ 11:00 (right side sweeping up)
  // For the large-arc flag: our sweep is going the short way (<180deg),
  // so large-arc = 0.
  const arcPath = `M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`;
  // Approximate arc length for stroke-dash:
  const sweepDeg = 135;
  const arcLen = (sweepDeg / 360) * 2 * Math.PI * r;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id="di-arc" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#d88966" />
          <stop offset="100%" stopColor="#f8d7bf" />
        </linearGradient>
      </defs>
      {/* Outer face */}
      <circle cx={center} cy={center} r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />
      {/* Inner face dot */}
      <circle cx={center} cy={center} r="2.5" fill="#d88966" />
      {/* Hour ticks */}
      {Array.from({ length: 12 }, (_, i) => {
        const [x1, y1] = hourPoint(i);
        const [x2, y2] = (() => {
          const deg = (i / 12) * 360 - 90;
          const rad = (deg * Math.PI) / 180;
          return [center + (r - 7) * Math.cos(rad), center + (r - 7) * Math.sin(rad)];
        })();
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />;
      })}
      {/* Hour numerals (just 6 and 12) */}
      <text
        x={center}
        y={center - r - 10}
        textAnchor="middle"
        fontFamily="var(--font-body)"
        fontSize="10"
        letterSpacing="2"
        fill="rgba(255,255,255,0.45)"
      >
        12
      </text>
      <text
        x={center}
        y={center + r + 18}
        textAnchor="middle"
        fontFamily="var(--font-body)"
        fontSize="10"
        letterSpacing="2"
        fill="rgba(255,255,255,0.45)"
      >
        6
      </text>
      {/* Sweep arc */}
      <path
        d={arcPath}
        fill="none"
        stroke="url(#di-arc)"
        strokeWidth="5"
        strokeLinecap="round"
        style={{
          strokeDasharray: arcLen,
          strokeDashoffset: visible ? 0 : arcLen,
          transition: 'stroke-dashoffset 2.4s cubic-bezier(0.22,1,0.36,1) 0.2s',
        }}
      />
      {/* End-point beacon (rides the end of the arc) */}
      <circle
        cx={ex}
        cy={ey}
        r="6"
        fill="#d88966"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.5s ease 2.6s',
        }}
      />
      {/* Center label */}
      <text
        x={center}
        y={center - 4}
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize="15"
        fontStyle="italic"
        fill="rgba(255,255,255,0.9)"
      >
        the window
      </text>
      <text
        x={center}
        y={center + 14}
        textAnchor="middle"
        fontFamily="var(--font-body)"
        fontSize="10"
        letterSpacing="2.5"
        fill="rgba(255,255,255,0.45)"
      >
        6:30 AM — 11:00 AM
      </text>
    </svg>
  );
}
