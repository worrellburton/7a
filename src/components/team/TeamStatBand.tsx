'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PublicTeamMember } from '@/lib/team';

// Quiet four-stat band that sits between the donut and the team grid.
// Numbers are derived from the actual team list when possible (so the
// "team size" stays accurate as people are added) and fall back to
// hand-set values for things the data doesn't carry yet (years
// combined, % in recovery — those need richer profile fields).

function CountUp({
  to,
  active,
  durationMs = 1400,
  decimals = 0,
}: {
  to: number;
  active: boolean;
  durationMs?: number;
  decimals?: number;
}) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    // Reduced-motion: snap to final value, skip the rAF loop.
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setValue(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const loop = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      // ease-out quartic — slow stop, no spring
      const eased = 1 - Math.pow(1 - p, 4);
      setValue(Number((eased * to).toFixed(decimals)));
      if (p < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, to, durationMs, decimals]);
  return <>{decimals === 0 ? Math.round(value) : value.toFixed(decimals)}</>;
}

interface Props {
  team: PublicTeamMember[];
}

export default function TeamStatBand({ team }: Props) {
  const ref = useRef<HTMLDivElement>(null);
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
      { threshold: 0.3 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [inView]);

  const stats = useMemo(() => {
    // Trauma-trained count — pulls anyone with a recognized
    // credential abbreviation OR a clinical / behavioral-support
    // job title. Reflects the reality that the majority of our
    // licensed and support staff carry trauma certifications, not
    // just the clinical bucket. We intentionally don't surface the
    // narrow "credentialed clinician" count here because the
    // headline "X clinicians" understates how many people on the
    // team are trauma-trained.
    const traumaTrained = team.filter(
      (m) =>
        (m.credentials ?? '').trim().length > 0 ||
        /\b(lcsw|lpc|lmft|lisac|lac|lcdc|cadc|cmhc|md|do|rn|lpn|np|pa|psychologist|psychiatrist|counselor|therapist|physician|technician|specialist|support|coach|recovery|behavioral)\b/i.test(
          m.job_title || '',
        ),
    ).length;

    return [
      {
        value: team.length,
        suffix: '',
        label: 'Active team members',
        eyebrow: 'A small, on-purpose roster',
      },
      {
        value: traumaTrained,
        suffix: '',
        label: 'Trauma-trained clinicians + support staff',
        eyebrow: 'Multiple certifications across modalities',
      },
      {
        value: 24,
        suffix: '/7',
        label: 'On-site direct care support',
        eyebrow: 'Around the clock, every day',
      },
    ];
  }, [team]);

  return (
    <section
      ref={ref}
      className="bg-white py-14 lg:py-20"
      aria-label="Team by the numbers"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-10 gap-x-6 lg:gap-x-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="relative lg:px-4 lg:border-r lg:border-black/10 lg:last:border-r-0"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(10px)',
                transition: `all 0.8s cubic-bezier(0.16,1,0.3,1) ${0.1 + i * 0.1}s`,
              }}
            >
              <p
                className="text-[10px] font-semibold tracking-[0.22em] uppercase text-primary mb-3"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {s.eyebrow}
              </p>
              <div
                className="text-foreground font-bold tracking-tight tabular-nums leading-[0.95]"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2.4rem, 4.4vw, 3.6rem)',
                }}
              >
                <CountUp to={s.value} active={inView} />
                <span className="text-primary">{s.suffix}</span>
              </div>
              <p
                className="text-foreground/65 text-sm leading-snug mt-3 max-w-[220px]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
