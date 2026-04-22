'use client';

import { useMemo, useState } from 'react';
import { RangeSelector } from './RangeSelector';
import { SectionNav, SECTIONS, type AnalyticsSection } from './SectionNav';
import { OverviewSection } from './OverviewSection';
import { type DateRange, rangeForPreset } from './shared';

export default function AnalyticsContent() {
  const [section, setSection] = useState<AnalyticsSection>('overview');
  const [range, setRange] = useState<DateRange>(() => rangeForPreset('30d'));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-2">
          Marketing &amp; Admissions
        </p>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-foreground/60 mt-2 max-w-2xl">
          Site-wide GA4 performance for sevenarrowsrecovery.com. Live from the
          Google Analytics Data API + Search Console.
        </p>
      </div>

      <RangeSelector range={range} onChange={setRange} />
      <SectionNav active={section} onChange={setSection} />

      {section === 'overview' && <OverviewSection range={range} />}
      {section !== 'overview' && <SectionStub section={section} />}
    </div>
  );
}

function SectionStub({ section }: { section: AnalyticsSection }) {
  const meta = useMemo(() => SECTIONS.find((s) => s.key === section), [section]);
  return (
    <div className="rounded-2xl border border-dashed border-black/10 bg-white/50 p-10 text-center">
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/40 mb-2">
        Coming next
      </p>
      <h2 className="text-xl font-bold text-foreground mb-1">{meta?.label}</h2>
      <p className="text-sm text-foreground/60 max-w-md mx-auto">
        {meta?.hint}. This section lands in a following phase — the range
        selector and navigation above are already wired, so it&apos;ll light up
        with live data as each phase ships.
      </p>
    </div>
  );
}
