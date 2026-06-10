import type { Metadata } from 'next';
import KaizenContent from './content';

export const metadata: Metadata = { title: 'Kaizen · Super admin' };

export default function KaizenPage() {
  return <KaizenContent />;
}
