import type { Metadata } from 'next';
import RedirectsContent from './content';

export const metadata: Metadata = {
  title: 'Redirects · SEO · Feather',
};

export default function RedirectsPage() {
  return <RedirectsContent />;
}
