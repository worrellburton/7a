import type { Metadata } from 'next';
import { Suspense } from 'react';
import NumberCallsContent from './content';

export const metadata: Metadata = {
  title: 'Caller history',
};

export default function NumberCallsPage() {
  return (
    <Suspense fallback={null}>
      <NumberCallsContent />
    </Suspense>
  );
}
