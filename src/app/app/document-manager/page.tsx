import type { Metadata } from 'next';
import DocumentManagerContent from './content';

export const metadata: Metadata = {
  title: 'Document Manager - Patient Portal',
};

export default function DocumentManagerPage() {
  return <DocumentManagerContent />;
}
