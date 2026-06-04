import type { Metadata } from 'next';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

export const metadata: Metadata = {
  title: 'Outreach',
};

// Lazy-loaded — 8,300-line content component is the largest single
// file in the app. Splitting it off the initial admin bundle is the
// single biggest TTI win available.
const ContactsContent = dynamic(() => import('./content'), { ssr: false });

export default function ContactsPage() {
  return (
    <Suspense fallback={null}>
      <ContactsContent />
    </Suspense>
  );
}
