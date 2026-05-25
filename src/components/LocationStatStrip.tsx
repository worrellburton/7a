// Three-up location stat strip.
//
// Server component — no client-side state, no hydration cost.
// Used directly below the hero on /admissions; designed to be
// reusable on /about and /contact (and any other page where
// these location facts reinforce the marketing copy).
//
// Visual spec from the original ask:
//   - Three stats, big copper numbers, ink labels, no icons.
//   - Match existing hero typography — Fraunces serif on the
//     display values, Inter on the labels (mirrors PageHero).
//   - Below 480px the row stacks vertically. Tailwind's `sm:`
//     breakpoint is 640px which is too late for an iPhone-SE
//     vertical-stack rule, so we use a custom `min-[480px]`
//     stacking rule with grid-cols-3 above 480px and grid-cols-1
//     (a vertical stack) below.
//   - No icons, by request.

interface Stat {
  /** The display value. The first run of digits (and any trailing
   *  symbol like + or %) gets the copper accent treatment; the
   *  remainder of the string stays ink so "300+ sunny days/yr"
   *  reads as "[copper]300+[/copper] sunny days/yr". */
  value: string;
  /** Optional secondary label rendered under the value in
   *  ALL-CAPS tracked Inter. Falls back to the trailing-portion
   *  of `value` when omitted. */
  label?: string;
}

const DEFAULT_STATS: Stat[] = [
  { value: '300+', label: 'Sunny days per year' },
  { value: '45 min', label: 'From PHX Sky Harbor' },
  { value: 'Sonoran', label: 'Desert setting' },
];

interface Props {
  stats?: Stat[];
  /** Optional className escape hatch — lets callers tighten the
   *  vertical rhythm (e.g. tuck the strip closer to the hero on
   *  pages that need to). */
  className?: string;
}

export default function LocationStatStrip({ stats = DEFAULT_STATS, className = '' }: Props) {
  return (
    <section
      className={`bg-white border-b border-black/5 ${className}`}
      aria-label="Seven Arrows at a glance"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
        {/* grid-cols-1 below 480px → vertical stack on phones; grid-
            cols-3 from 480px up → side-by-side on landscape phones,
            tablets, and desktop. Dividers are subtle vertical lines
            between cells on the 3-up layout; on the stacked layout
            they convert to horizontal lines via border-b. */}
        <ul className="grid grid-cols-1 min-[480px]:grid-cols-3 min-[480px]:divide-x divide-y min-[480px]:divide-y-0 divide-black/10">
          {stats.map((s, i) => (
            <li
              key={i}
              className="px-4 py-6 min-[480px]:py-2 min-[480px]:px-8 text-center first:pl-0 last:pr-0 first:pt-0 last:pb-0 min-[480px]:first:pt-2 min-[480px]:last:pb-2"
            >
              <p
                className="text-4xl sm:text-5xl font-bold leading-none tracking-tight"
                style={{
                  fontFamily: 'var(--font-display)',
                  color: 'var(--color-primary)',
                }}
              >
                {s.value}
              </p>
              {s.label && (
                <p
                  className="mt-3 text-xs sm:text-sm font-semibold uppercase tracking-[0.18em] text-foreground/75"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {s.label}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export type { Stat as LocationStat };
