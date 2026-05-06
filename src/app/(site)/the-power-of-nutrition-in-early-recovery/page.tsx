import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Power of Nutrition in Early Recovery | Seven Arrows Recovery',
  description:
    'At Seven Arrows Recovery Center in Arizona, embracing nutrition in recovery is a foundational step toward holistic healing for those dealing with substance abuse.',
  keywords:
    'the power of nutrition in early recovery, the power of nutrition in early recovery, addiction recovery, Seven Arrows Recovery, Arizona rehab',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/the-power-of-nutrition-in-early-recovery',
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
