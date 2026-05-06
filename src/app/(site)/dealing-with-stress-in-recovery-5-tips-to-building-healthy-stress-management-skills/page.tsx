import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dealing with Stress in Recovery: 5 Tips to Building Healthy Stress-Management Skills | Seven Arrows Recovery',
  description:
    'Since stress is an inevitable part of life, learning stress-management is essential to living a healthy life.',
  keywords:
    'dealing with stress in recovery: 5 tips to building healthy stress-management skills, dealing with stress in recovery 5 tips to building healthy stress management skills, addiction recovery, Seven Arrows Recovery, Arizona rehab',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/dealing-with-stress-in-recovery-5-tips-to-building-healthy-stress-management-skills',
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
