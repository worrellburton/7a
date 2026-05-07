import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Can I Force Someone to Go to Rehab? | Seven Arrows Recovery",
  description: "Watching someone you love struggle with addiction is one of the most painful experiences you can go through. You see the damage it’s doing, to their health, their relationships, and their future, and you just want to help. But…",
  keywords: "force someone to go to rehab, can i force someone to go to rehab?, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/force-someone-to-go-to-rehab",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
