'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Next 16: `ssr: false` only allowed inside a Client Component.
// page.tsx stays a Server Component (for the metadata export) and
// renders this loader, which keeps the lazy-load + skip-SSR
// behavior the 8,300-line content bundle needs.
const ContactsContent = dynamic(() => import('./content'), { ssr: false });

export default function ContactsLoader() {
  return (
    <Suspense fallback={null}>
      <ContactsContent />
    </Suspense>
  );
}
