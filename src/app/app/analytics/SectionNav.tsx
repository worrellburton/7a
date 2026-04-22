'use client';

export type AnalyticsSection =
  | 'overview'
  | 'acquisition'
  | 'engagement'
  | 'pages'
  | 'seo'
  | 'conversions'
  | 'audience'
  | 'realtime'
  | 'compare'
  | 'insights';

export const SECTIONS: { key: AnalyticsSection; label: string; hint: string }[] = [
  { key: 'overview', label: 'Overview', hint: 'Executive snapshot' },
  { key: 'acquisition', label: 'Acquisition', hint: 'Where traffic comes from' },
  { key: 'engagement', label: 'Engagement', hint: 'What visitors do' },
  { key: 'pages', label: 'Pages', hint: 'Content performance' },
  { key: 'seo', label: 'SEO', hint: 'Search Console' },
  { key: 'conversions', label: 'Conversions', hint: 'Forms & calls' },
  { key: 'audience', label: 'Audience', hint: 'Geo & device' },
  { key: 'realtime', label: 'Realtime', hint: 'Right now' },
  { key: 'compare', label: 'Compare', hint: 'Period over period' },
  { key: 'insights', label: 'Insights', hint: 'What to fix next' },
];

interface Props {
  active: AnalyticsSection;
  onChange: (s: AnalyticsSection) => void;
}

export function SectionNav({ active, onChange }: Props) {
  return (
    <div className="sticky top-0 z-10 -mx-8 mb-6 bg-warm-bg/80 px-8 py-2 backdrop-blur-md border-b border-black/5">
      <div className="overflow-x-auto no-scrollbar">
        <div className="inline-flex gap-1">
          {SECTIONS.map((s) => {
            const isActive = s.key === active;
            return (
              <button
                key={s.key}
                onClick={() => onChange(s.key)}
                className={`px-3.5 py-2 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-foreground text-white shadow-sm'
                    : 'text-foreground/60 hover:text-foreground hover:bg-white'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
