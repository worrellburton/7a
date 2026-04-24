'use client';

import { useState } from 'react';
import { RangeSelector } from './RangeSelector';
import { SectionNav, type AnalyticsSection } from './SectionNav';
import { OverviewSection } from './OverviewSection';
import { AcquisitionSection } from './AcquisitionSection';
import { EngagementSection } from './EngagementSection';
import { PagesSection } from './PagesSection';
import { SeoSection } from './SeoSection';
import { ConversionsSection } from './ConversionsSection';
import { AudienceSection } from './AudienceSection';
import { RealtimeSection } from './RealtimeSection';
import { CompareSection } from './CompareSection';
import { InsightsSection } from './InsightsSection';
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
          Site-wide GA4 performance for sevenarrowsrecoveryarizona.com. Live from the
          Google Analytics Data API + Search Console.
        </p>
      </div>

      <RangeSelector range={range} onChange={setRange} />
      <SectionNav active={section} onChange={setSection} />

      {section === 'overview' && <OverviewSection range={range} />}
      {section === 'acquisition' && <AcquisitionSection range={range} />}
      {section === 'engagement' && <EngagementSection range={range} />}
      {section === 'pages' && <PagesSection range={range} />}
      {section === 'seo' && <SeoSection range={range} />}
      {section === 'conversions' && <ConversionsSection range={range} />}
      {section === 'audience' && <AudienceSection range={range} />}
      {section === 'realtime' && <RealtimeSection />}
      {section === 'compare' && <CompareSection range={range} />}
      {section === 'insights' && <InsightsSection range={range} />}
    </div>
  );
}
