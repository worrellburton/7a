import type { Metadata } from 'next';
import MercuryContent from './content';

export const metadata: Metadata = { title: 'Mercury · Super admin' };

export default function MercuryPage() {
  return <MercuryContent />;
}
