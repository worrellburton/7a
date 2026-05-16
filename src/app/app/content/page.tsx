import type { Metadata } from 'next';
import { Suspense } from 'react';
import ContentLanding from './content';

export const metadata: Metadata = {
  title: 'Content — Feather',
};

export default function ContentPage() {
  return (
    <Suspense fallback={null}>
      <ContentLanding />
    </Suspense>
  );
}
