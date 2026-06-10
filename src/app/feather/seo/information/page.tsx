import type { Metadata } from 'next';
import InformationContent from './content';

export const metadata: Metadata = {
  title: 'Information · SEO · Feather',
};

export default function InformationPage() {
  return <InformationContent />;
}
