'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Next 16: `ssr: false` only allowed inside a Client Component.
const ContentLanding = dynamic(() => import('./content'), { ssr: false });

export default function ContentLoader() {
  return (
    <Suspense fallback={null}>
      <ContentLanding />
    </Suspense>
  );
}
