import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'What Happens When You Walk Through the Door: Your First Week in Treatment | Seven Arrows Recovery',
  description:
    'A day-by-day guide to your first week in rehab at Seven Arrows Recovery. Learn what to expect during intake, detox, your first group session, and meeting your care team.',
  keywords: 'what to expect in rehab, first week of treatment, substance abuse treatment process, detox timeline, what happens in rehab, rehab first day',
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
