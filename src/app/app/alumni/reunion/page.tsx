import type { Metadata } from 'next';
import ReunionContent from './content';

export const metadata: Metadata = { title: 'The Reunion at the Ranch · Feather' };

export default function ReunionPage() {
  return <ReunionContent />;
}
