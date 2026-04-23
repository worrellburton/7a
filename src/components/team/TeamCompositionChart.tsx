'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PublicTeamMember } from '@/lib/team';

// Bucket every public team member into one of five disciplines based
// on their job title. Falls into "Operations" if nothing matches so
// the chart stays accurate (no orphaned members) without needing a
// schema column.
type Bucket = 'Leadership' | 'Clinical' | 'Medical' | 'Holistic' | 'Operations';

const BUCKET_ORDER: Bucket[] = ['Leadership', 'Clinical', 'Medical', 'Holistic', 'Operations'];

// Brand palette per bucket — terracotta for leadership, deeper amber
// for clinical, warm tan for medical, sage for holistic, slate for ops.
const BUCKET_COLOR: Record<Bucket, string> = {
  Leadership: '#bc6b4a',
  Clinical: '#a55a3d',
  Medical: '#d28a64',
  Holistic: '#8b9d7a',
  Operations: '#7a6b5d',
};

function bucketFor(jobTitle: string | null): Bucket {
  const t = (jobTitle || '').toLowerCase();
  if (/\b(ceo|coo|cfo|cmo|cto|cco|cio|chief|owner|founder|president|director)\b/.test(t))
    return 'Leadership';
  if (/\b(counselor|therapist|clinician|lcsw|lpc|lmft|lisac|psychologist|case manager|primary)\b/.test(t))
    return 'Clinical';
  if (/\b(md|do|physician|nurse|rn|lpn|nutritionist|dietitian|psychiatric)\b/.test(t))
    return 'Medical';
  if (/\b(yoga|equine|holistic|sound|breath|ceremony|sweat|art)\b/.test(t))
    return 'Holistic';
  return 'Operations';
}

function useInView<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current || inView) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            io.disconnect();
            return;
          }
        }
      },
      { threshold: 0.25 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [inView]);
  return { ref, inView };
}

interface Props {
  team: PublicTeamMember[];
}

export default function TeamCompositionChart({ team }: Props) {
  const { ref, inView } = useInView<HTMLDivElement>();

  const data = useMemo(() => {
    const counts: Record<Bucket, number> = {
      Leadership: 0,
      Clinical: 0,
      Medical: 0,
      Holistic: 0,
      Operations: 0,
    };
    for (const m of team) counts[bucketFor(m.job_title)] += 1;
    const total = team.length || 1;
    return BUCKET_ORDER.map((label) => ({
      label,
      count: counts[label],
      pct: counts[label] / total,
      color: BUCKET_COLOR[label],
    })).filter((d) => d.count > 0);
  }, [team]);

  // Donut geometry — single circle stroke; each segment is rendered by
  // animating stroke-dasharray + stroke-dashoffset from a shared
  // circumference. Keeps the SVG to one circle per slice instead of
  // computing arc paths.
  const radius = 56;
  const stroke = 14;
  const C = 2 * Math.PI * radius;

  const totalCount = team.length;

  return (
    <section
      ref={ref}
      className="bg-warm-bg py-16 lg:py-24 border-y border-black/5"
      aria-labelledby="team-composition-heading"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left: the donut */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-[260px] h-[260px] sm:w-[300px] sm:h-[300px]">
              <svg
                viewBox="0 0 160 160"
                className="absolute inset-0 w-full h-full -rotate-90"
                aria-hidden="true"
              >
                {/* Faint full ring as the rail. */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke="rgba(20,10,6,0.08)"
                  strokeWidth={stroke}
                />
                {(() => {
                  let cumulative = 0;
                  return data.map((slice, i) => {
                    const length = slice.pct * C;
                    // Gap between slices so each one feels distinct
                    // — 2px in the rotated SVG ≈ 2px on screen.
                    const gap = data.length > 1 ? 2 : 0;
                    const drawn = inView ? Math.max(0, length - gap) : 0;
                    const offset = -cumulative;
                    cumulative += length;
                    return (
                      <circle
                        key={slice.label}
                        cx="80"
                        cy="80"
                        r={radius}
                        fill="none"
                        stroke={slice.color}
                        strokeWidth={stroke}
                        strokeLinecap="butt"
                        strokeDasharray={`${drawn} ${C - drawn}`}
                        strokeDashoffset={offset}
                        style={{
                          transition: `stroke-dasharray 1.4s cubic-bezier(0.16,1,0.3,1) ${0.2 + i * 0.18}s`,
                        }}
                      />
                    );
                  });
                })()}
              </svg>

              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span
                  className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/50"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Team
                </span>
                <span
                  className="font-bold text-foreground tabular-nums leading-none mt-1"
                  style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.4rem, 4vw, 3rem)' }}
                >
                  {totalCount}
                </span>
                <span
                  className="text-[11px] text-foreground/55 mt-1"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  members
                </span>
              </div>
            </div>
          </div>

          {/* Right: copy + legend */}
          <div className="lg:col-span-7">
            <p className="section-label mb-4">Team Composition</p>
            <h2
              id="team-composition-heading"
              className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Five disciplines, <em className="not-italic text-primary">one team</em>.
            </h2>
            <p
              className="text-foreground/70 leading-relaxed text-base lg:text-lg mb-8 max-w-xl"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Recovery is interdisciplinary by necessity. We staff Seven Arrows
              with a deliberate balance of clinical, medical, holistic, and
              operations expertise — so your treatment plan doesn&rsquo;t hand
              off between buildings, vendors, or shifts.
            </p>

            <ul className="grid grid-cols-2 gap-x-6 gap-y-3 max-w-md">
              {data.map((slice, i) => (
                <li
                  key={slice.label}
                  className="flex items-center gap-2.5"
                  style={{
                    opacity: inView ? 1 : 0,
                    transform: inView ? 'translateX(0)' : 'translateX(-8px)',
                    transition: `all 0.7s cubic-bezier(0.16,1,0.3,1) ${0.6 + i * 0.08}s`,
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: slice.color }}
                  />
                  <span
                    className="text-sm font-semibold text-foreground"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {slice.label}
                  </span>
                  <span
                    className="text-[11px] tabular-nums text-foreground/50 ml-auto"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {slice.count} · {Math.round(slice.pct * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
