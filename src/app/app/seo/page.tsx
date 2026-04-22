import type { Metadata } from 'next';
import SeoContent from './content';

export const metadata: Metadata = {
  title: 'SEO - Patient Portal',
};

export default function SeoPage() {
  return <SeoContent />;
}
