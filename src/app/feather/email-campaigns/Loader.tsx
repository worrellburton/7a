'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Next 16: `ssr: false` only allowed inside a Client Component.
const EmailCampaignsContent = dynamic(() => import('./content'), { ssr: false });

export default function EmailCampaignsLoader() {
  return (
    <Suspense fallback={null}>
      <EmailCampaignsContent />
    </Suspense>
  );
}
