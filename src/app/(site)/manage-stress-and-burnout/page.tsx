import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Best Manage Stress and Burnout | Seven Arrows Recovery',
  description:
    'In the modern, fast-paced world, stress and burnout have become common challenges, especially for those facing drug addiction.',
  keywords:
    'how to best manage stress and burnout, manage stress and burnout, addiction recovery, Seven Arrows Recovery, Arizona rehab',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/manage-stress-and-burnout',
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
