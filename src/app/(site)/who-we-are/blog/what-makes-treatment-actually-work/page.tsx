import type { Metadata } from 'next';

export const metadata: Metadata = {
  title:
    'What Actually Makes Treatment Work: The Therapeutic Alliance | Seven Arrows Recovery',
  description:
    'The research is clear: the relationship between client and clinician predicts recovery outcomes more than any single modality. An investigative look at why programs that lead with their modality mix have it backwards — and how to spot a real therapeutic alliance on a tour.',
  keywords:
    'therapeutic alliance, therapeutic alliance addiction treatment, what makes rehab work, evidence-based addiction treatment, common factors therapy, relationship vs modality, choosing a rehab, rehab tour questions, residential treatment arizona',
  alternates: {
    canonical:
      'https://sevenarrowsrecovery.com/who-we-are/blog/what-makes-treatment-actually-work',
  },
  openGraph: {
    type: 'article',
    title:
      'Modalities Support the Process. Relationship Drives the Outcome.',
    description:
      'The therapeutic alliance — not the modality mix — is the strongest predictor of recovery outcomes. Here is what the research shows, and how to tell on a tour whether a program has it.',
    url: 'https://sevenarrowsrecovery.com/who-we-are/blog/what-makes-treatment-actually-work',
    siteName: 'Seven Arrows Recovery',
    images: [
      {
        url: '/images/individual-therapy-session.jpg',
        width: 1200,
        height: 630,
        alt: 'A clinician and client in conversation during an individual therapy session at Seven Arrows Recovery.',
      },
    ],
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
