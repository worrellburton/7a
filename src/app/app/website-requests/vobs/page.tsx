import type { Metadata } from 'next';
import VobsContent from './content';

export const metadata: Metadata = {
  title: 'VOBs - Website Requests - Patient Portal',
};

export default function VobsPage() {
  return <VobsContent />;
}
