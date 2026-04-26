import type { Metadata } from 'next';
import BacklinksContent from './content';

export const metadata: Metadata = {
  title: 'Backlinks - Patient Portal',
};

export default function BacklinksPage() {
  return <BacklinksContent />;
}
