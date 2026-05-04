import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Go to Rehab Without Losing Your Job | Seven Arrows Recovery',
  description:
    'How the Family and Medical Leave Act (FMLA) protects your job while you go to rehab — eligibility, how the leave works for substance abuse treatment, and what to do next at Seven Arrows Recovery.',
  keywords:
    'rehab without losing job, FMLA rehab, FMLA substance abuse, job protection rehab, addiction treatment leave, FMLA eligibility, rehab Arizona',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/how-to-go-to-rehab-without-loosing-your-job',
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
