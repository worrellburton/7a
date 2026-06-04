import type { Metadata } from 'next';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

export const metadata: Metadata = {
  title: 'Content — Feather',
};

// Lazy-loaded — 1,400-line content component plus the analytics +
// roadmap deps. ssr:false safe on this auth-gated /app/* page.
const ContentLanding = dynamic(() => import('./content'), { ssr: false });

export default function ContentPage() {
  return (
    <Suspense fallback={null}>
      <ContentLanding />
    </Suspense>
  );
}
