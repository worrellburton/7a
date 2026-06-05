'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Next 16: `ssr: false` only allowed inside a Client Component.
const SocialMediaContent = dynamic(() => import('./content'), { ssr: false });

export default function SocialMediaLoader() {
  return (
    <Suspense fallback={null}>
      <SocialMediaContent />
    </Suspense>
  );
}
