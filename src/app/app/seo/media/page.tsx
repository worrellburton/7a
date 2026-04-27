import type { Metadata } from 'next';
import MediaContent from './content';

export const metadata: Metadata = {
  title: 'SEO Media',
};

export default function SeoMediaPage() {
  return <MediaContent />;
}
