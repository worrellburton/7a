import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sound Therapy and Addiction Treatment: How It Aids the Recovery Process | Seven Arrows Recovery',
  description:
    'Embarking on the path to addiction recovery is a courageous journey that requires a holistic approach to healing.',
  keywords:
    'sound therapy and addiction treatment: how it aids the recovery process, sound therapy and addiction treatment, addiction recovery, Seven Arrows Recovery, Arizona rehab',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/sound-therapy-and-addiction-treatment',
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
