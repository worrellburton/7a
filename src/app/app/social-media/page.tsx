import type { Metadata } from 'next';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

export const metadata: Metadata = {
  title: 'Social Media — Feather',
};

// Lazy-load the 3,800-line content component. /app/social-media is one
// of the heaviest routes in the app; bundling it on every other page's
// initial paint slowed every admin nav. ssr:false is safe because this
// is an auth-gated /app/* route, not crawled by SEO bots, and the
// runtime fallback is a no-op spinner via the Suspense wrapper.
const SocialMediaContent = dynamic(() => import('./content'), { ssr: false });

export default function SocialMediaPage() {
  return (
    <Suspense fallback={null}>
      <SocialMediaContent />
    </Suspense>
  );
}
