import type { Metadata } from 'next';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

export const metadata: Metadata = {
  title: 'Directories - Feather',
};

// Lazy-loaded — 6,200-line content component plus the screenshots
// helper bundle. ssr:false safe on this auth-gated /app/seo/* page.
const DirectoriesContent = dynamic(() => import('./content'), { ssr: false });

export default function DirectoriesPage() {
  return (
    <Suspense fallback={null}>
      <DirectoriesContent />
    </Suspense>
  );
}
