import type { Metadata } from 'next';
import StoriesContent from './content';

export const metadata: Metadata = { title: 'Voices & talks · Feather' };

export default function StoriesPage() {
  return <StoriesContent />;
}
