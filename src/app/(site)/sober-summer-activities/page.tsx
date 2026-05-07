import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Sober Summer Activities | Seven Arrows Recovery",
  description: "If you’re in recovery, the idea of warm weather, late nights, and seasonal events can feel complicated. But sober summer activities don’t have to be boring or isolating. Summer can become one of the most fulfilling times in your…",
  keywords: "sober summer activities, sober summer activities, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/sober-summer-activities",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
