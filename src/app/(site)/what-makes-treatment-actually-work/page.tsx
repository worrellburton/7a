import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title:
    'What Actually Makes Treatment Work: The Therapeutic Alliance | Seven Arrows Recovery',
  description:
    'The research is clear: the relationship between client and clinician predicts recovery outcomes more than any single modality. An investigative look at why programs that lead with their modality mix have it backwards — and how to spot a real therapeutic alliance on a tour.',
  keywords:
    'therapeutic alliance, therapeutic alliance addiction treatment, what makes rehab work, evidence-based addiction treatment, common factors therapy, relationship vs modality, choosing a rehab, rehab tour questions, residential treatment arizona',
  alternates: {
    canonical:
      'https://sevenarrowsrecoveryarizona.com/what-makes-treatment-actually-work',
  },
  openGraph: {
    type: 'article',
    title:
      'Modalities Support the Process. Relationship Drives the Outcome.',
    description:
      'The therapeutic alliance — not the modality mix — is the strongest predictor of recovery outcomes. Here is what the research shows, and how to tell on a tour whether a program has it.',
    url: 'https://sevenarrowsrecoveryarizona.com/what-makes-treatment-actually-work',
    siteName: 'Seven Arrows Recovery',
    images: [
      {
        url: '/hero/individual-therapy-session.jpg',
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
