import type { Metadata } from 'next';
import { Suspense } from 'react';
import WebsiteRequestsContent from './content';

export const metadata: Metadata = {
  title: 'Website Requests - Patient Portal',
};

export default function WebsiteRequestsPage() {
  // useSearchParams in WebsiteRequestsContent forces this route to be
  // client-rendered; wrap in Suspense so the build doesn't bail.
  return (
    <Suspense fallback={null}>
      <WebsiteRequestsContent />
    </Suspense>
  );
}
