import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

export const metadata: Metadata = {
  title: 'Alumni — Feather',
};

// Lazy — the roster table + sort/filter UI is a few hundred lines
// and the page is admin-only, so SSR adds nothing.
const AlumniRosterContent = dynamic(() => import('./content'), { ssr: false });

export default function AlumniRosterPage() {
  return <AlumniRosterContent />;
}
