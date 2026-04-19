import type { Metadata } from 'next';
import { Suspense } from 'react';
import DocumentDetailContent from './content';

export const metadata: Metadata = {
  title: 'Document',
};

export default function DocumentDetailPage() {
  return (
    <Suspense fallback={null}>
      <DocumentDetailContent />
    </Suspense>
  );
}
