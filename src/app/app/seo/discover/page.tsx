import type { Metadata } from 'next';
import DiscoverContent from './content';

export const metadata: Metadata = {
  title: 'Keyword Discovery',
};

export default function SeoDiscoverPage() {
  return <DiscoverContent />;
}
