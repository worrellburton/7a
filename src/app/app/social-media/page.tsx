import type { Metadata } from 'next';
import { Suspense } from 'react';
import SocialMediaContent from './content';

export const metadata: Metadata = {
  title: 'Social Media — Feather',
};

export default function SocialMediaPage() {
  return (
    <Suspense fallback={null}>
      <SocialMediaContent />
    </Suspense>
  );
}
