import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'What Makes a Rehab Holistic | Seven Arrows Recovery',
  description:
    'Holistic rehab centers take a comprehensive approach to addiction treatment, addressing not only the physical aspects of addiction but also the emotional, mental, and spiritual components.',
  keywords:
    'what makes a rehab holistic, what makes a rehab holistic, addiction recovery, Seven Arrows Recovery, Arizona rehab',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/what-makes-a-rehab-holistic',
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
