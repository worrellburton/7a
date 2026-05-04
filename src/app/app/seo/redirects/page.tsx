import type { Metadata } from 'next';
import RedirectsContent from './content';

export const metadata: Metadata = {
  title: 'Redirects · SEO · Patient Portal',
};

export default function RedirectsPage() {
  return <RedirectsContent />;
}
