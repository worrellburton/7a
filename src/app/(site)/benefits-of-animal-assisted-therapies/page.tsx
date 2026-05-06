import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Benefits of Animal-Assisted Therapies in Addiction Treatment | Seven Arrows Recovery',
  description:
    'At Seven Arrows Recovery, we understand that the journey to recovery is deeply personal and challenging.',
  keywords:
    'the benefits of animal-assisted therapies in addiction treatment, benefits of animal assisted therapies, addiction recovery, Seven Arrows Recovery, Arizona rehab',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/benefits-of-animal-assisted-therapies',
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
