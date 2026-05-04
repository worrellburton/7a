import type { Metadata } from 'next';
import LocalContent from './content';

export const metadata: Metadata = {
  title: 'Local Pack',
};

export default function SeoLocalPage() {
  return <LocalContent />;
}
