'use client';

import { useMemo, useState } from 'react';
import TeamGrid from '@/components/TeamGrid';
import type { PublicTeamMember } from '@/lib/team';

// Same regex-based bucketing the donut uses so the chip filter and
// the chart agree about who lives in which discipline.
type Bucket = 'All' | 'Leadership' | 'Clinical' | 'Medical' | 'Holistic' | 'Operations';

const BUCKETS: Bucket[] = ['All', 'Leadership', 'Clinical', 'Medical', 'Holistic', 'Operations'];

function bucketFor(jobTitle: string | null): Exclude<Bucket, 'All'> {
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

interface Props {
  team: PublicTeamMember[];
}

export default function FilterableTeamGrid({ team }: Props) {
  const [active, setActive] = useState<Bucket>('All');

  const counts = useMemo(() => {
    const acc: Record<Bucket, number> = {
      All: team.length,
      Leadership: 0,
      Clinical: 0,
      Medical: 0,
      Holistic: 0,
      Operations: 0,
    };
    for (const m of team) acc[bucketFor(m.job_title)] += 1;
    return acc;
  }, [team]);

  const visible = useMemo(() => {
    if (active === 'All') return team;
    return team.filter((m) => bucketFor(m.job_title) === active);
  }, [team, active]);

  // Hide chips with zero matches so we don't render a useless filter
  // (e.g. a brand-new install with no Holistic staff yet).
  const renderableChips = BUCKETS.filter((b) => counts[b] > 0);

  return (
    <div>
      {renderableChips.length > 1 && (
        <div className="mb-8 lg:mb-10 flex flex-wrap gap-2 justify-center">
          {renderableChips.map((b) => {
            const isActive = active === b;
            return (
              <button
                key={b}
                type="button"
                onClick={() => setActive(b)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-foreground text-white shadow-sm'
                    : 'bg-warm-bg text-foreground/70 hover:bg-warm-bg/70 hover:text-foreground border border-black/5'
                }`}
                style={{ fontFamily: 'var(--font-body)' }}
                aria-pressed={isActive}
              >
                <span>{b}</span>
                <span
                  className={`tabular-nums text-[10px] rounded-full px-1.5 py-0.5 ${
                    isActive ? 'bg-white/15 text-white/80' : 'bg-black/5 text-foreground/55'
                  }`}
                >
                  {counts[b]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {visible.length === 0 ? (
        <p
          className="text-center text-foreground/50 py-10"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          No team members in this group yet.
        </p>
      ) : (
        <TeamGrid team={visible} />
      )}
    </div>
  );
}
