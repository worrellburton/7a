import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Inpatient Mental Health Facilities in Arizona | Seven Arrows Recovery',
  description:
    'Understanding how to find the best inpatient mental health facilities in Arizona is crucial in your journey to healing and recovery.',
  keywords:
    'inpatient mental health facilities in arizona, inpatient mental health facilities in arizona, addiction recovery, Seven Arrows Recovery, Arizona rehab',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/inpatient-mental-health-facilities-in-arizona',
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
