import type { Metadata } from 'next';
import InformationContent from './content';

export const metadata: Metadata = {
  title: 'Information · SEO · Patient Portal',
};

export default function InformationPage() {
  return <InformationContent />;
}
