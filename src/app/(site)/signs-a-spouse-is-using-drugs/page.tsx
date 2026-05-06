import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Signs a Spouse is Using Drugs | Seven Arrows Recovery',
  description:
    'Substance abuse doesn’t just affect individuals—it creates ripple effects that touch everyone close to them, especially spouses.',
  keywords:
    'signs a spouse is using drugs, signs a spouse is using drugs, addiction recovery, Seven Arrows Recovery, Arizona rehab',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/signs-a-spouse-is-using-drugs',
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
