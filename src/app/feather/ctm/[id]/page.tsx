import type { Metadata } from 'next';
import { Suspense } from 'react';
import CallDetailContent from './content';

export const metadata: Metadata = {
  title: 'Call',
};

export default function CallDetailPage() {
  return (
    <Suspense fallback={null}>
      <CallDetailContent />
    </Suspense>
  );
}
