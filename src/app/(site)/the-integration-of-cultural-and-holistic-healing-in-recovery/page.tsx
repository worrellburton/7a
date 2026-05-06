import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Integration of Cultural and Holistic Healing in Recovery | Seven Arrows Recovery',
  description:
    'Native American healing traditions have played a significant role in addiction recovery for centuries.',
  keywords:
    'the integration of cultural and holistic healing in recovery, the integration of cultural and holistic healing in recovery, addiction recovery, Seven Arrows Recovery, Arizona rehab',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/the-integration-of-cultural-and-holistic-healing-in-recovery',
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
