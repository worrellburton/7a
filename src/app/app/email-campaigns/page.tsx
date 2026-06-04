import type { Metadata } from 'next';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

export const metadata: Metadata = {
  title: 'Email Campaigns',
};

// Lazy-loaded — the content component pulls Resend client wiring,
// recipient analytics, and 1k+ lines of UI. Code-split so the rest
// of /app/* isn't hauling this bundle on every initial paint.
const EmailCampaignsContent = dynamic(() => import('./content'), { ssr: false });

export default function EmailCampaignsPage() {
  return (
    <Suspense fallback={null}>
      <EmailCampaignsContent />
    </Suspense>
  );
}
