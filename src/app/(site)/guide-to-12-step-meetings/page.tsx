import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'A Simple Guide to 12-Step Meetings | Seven Arrows Recovery',
  description:
    'The journey to recovery is deeply personal, filled with unique challenges and moments of profound growth.',
  keywords:
    'a simple guide to 12-step meetings, guide to 12 step meetings, addiction recovery, Seven Arrows Recovery, Arizona rehab',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/guide-to-12-step-meetings',
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
