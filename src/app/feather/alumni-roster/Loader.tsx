'use client';

import dynamic from 'next/dynamic';

// Next 16 only allows `ssr: false` on dynamic() inside Client
// Components. This thin client wrapper holds the dynamic import so
// page.tsx can stay a Server Component (and keep exporting
// `metadata`) while we still get code-splitting + no SSR for the
// admin-only roster bundle.
const AlumniRosterContent = dynamic(() => import('./content'), { ssr: false });

export default function AlumniRosterLoader() {
  return <AlumniRosterContent />;
}
