import type { Metadata } from 'next';
import { Suspense } from 'react';
import DocumentManagerContent from './content';

export const metadata: Metadata = {
  title: 'Document Manager',
};

export default function DocumentManagerPage() {
  return (
    <Suspense fallback={null}>
      <DocumentManagerContent />
    </Suspense>
  );
}
