import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Role of Support Groups in Addiction Recovery | Seven Arrows Recovery',
  description:
    'Addiction recovery can be filled with many ups and downs. This is because becoming sober is just the beginning of your sobriety journey.',
  keywords:
    'the role of support groups in addiction recovery, role of support groups in addiction recovery, addiction recovery, Seven Arrows Recovery, Arizona rehab',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/role-of-support-groups-in-addiction-recovery',
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
