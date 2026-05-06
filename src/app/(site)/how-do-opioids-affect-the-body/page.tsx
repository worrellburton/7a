import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How Do Opioids Affect the Body? | Seven Arrows Recovery',
  description:
    'Opioids are a class of drugs that include prescription painkillers like oxycodone and hydrocodone and illicit substances such as heroin.',
  keywords:
    'how do opioids affect the body, how do opioids affect the body, addiction recovery, Seven Arrows Recovery, Arizona rehab',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/how-do-opioids-affect-the-body',
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
