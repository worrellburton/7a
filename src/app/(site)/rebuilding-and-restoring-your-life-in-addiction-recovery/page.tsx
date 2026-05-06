import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rebuilding and Restoring Your Life in Addiction Recovery | Seven Arrows Recovery',
  description:
    'Recovery from substance abuse and addiction is a lifelong process and can come in many forms. But still many people continue to think that residential treatments and detox programs are the most…',
  keywords:
    'rebuilding and restoring your life in addiction recovery, rebuilding and restoring your life in addiction recovery, addiction recovery, Seven Arrows Recovery, Arizona rehab',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/rebuilding-and-restoring-your-life-in-addiction-recovery',
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
