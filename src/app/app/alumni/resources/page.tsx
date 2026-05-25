import type { Metadata } from 'next';
import ResourcesContent from './content';

export const metadata: Metadata = { title: 'Recovery resources · Feather' };

export default function ResourcesPage() {
  return <ResourcesContent />;
}
