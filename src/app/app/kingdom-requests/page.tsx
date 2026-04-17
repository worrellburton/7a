import type { Metadata } from 'next';
import KingdomRequestsContent from './content';

export const metadata: Metadata = {
  title: 'Kingdom Requests',
};

export default function KingdomRequestsPage() {
  return <KingdomRequestsContent />;
}
