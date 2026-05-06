import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Help Your Alcoholic Spouse | Seven Arrows Recovery',
  description:
    'Alcohol abuse is a pervasive issue that affects millions of individuals and their families worldwide. When someone you love is struggling with alcohol use disorder (AUD), the impact reverberates…',
  keywords:
    'how to help your alcoholic spouse, how to help your alcoholic spouse, addiction recovery, Seven Arrows Recovery, Arizona rehab',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/how-to-help-your-alcoholic-spouse',
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
