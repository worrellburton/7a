import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "How to Practice Self Care | Seven Arrows Recovery",
  description: "Self-care is an essential practice that promotes overall well-being, helps manage stress, and enhances our physical, emotional, and mental health. In today’s fast-paced and demanding world, taking time for self-care is more…",
  keywords: "how to practice self care, how to practice self care, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/how-to-practice-self-care",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
