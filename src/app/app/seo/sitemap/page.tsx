import type { Metadata } from 'next';
import SitemapContent from './content';

export const metadata: Metadata = {
  title: 'Sitemap - SEO',
};

export default function SitemapPage() {
  return <SitemapContent />;
}
