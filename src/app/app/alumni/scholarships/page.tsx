import type { Metadata } from 'next';
import ScholarshipsContent from './content';

export const metadata: Metadata = { title: 'Scholarships · Feather' };

export default function ScholarshipsPage() {
  return <ScholarshipsContent />;
}
