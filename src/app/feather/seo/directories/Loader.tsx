'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Next 16: `ssr: false` only allowed inside a Client Component.
const DirectoriesContent = dynamic(() => import('./content'), { ssr: false });

export default function DirectoriesLoader() {
  return (
    <Suspense fallback={null}>
      <DirectoriesContent />
    </Suspense>
  );
}
