import type { Metadata } from 'next';
import { Suspense } from 'react';
import CallsContent from './content';

export const metadata: Metadata = {
  title: 'Calls',
};

export default function CallsPage() {
  // useSearchParams inside CallsContent forces this route to be
  // client-rendered; wrap in Suspense so the Next.js build doesn't
  // bail during static analysis.
  return (
    <Suspense fallback={null}>
      <CallsContent />
    </Suspense>
  );
}
