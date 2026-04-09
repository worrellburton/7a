import type { Metadata } from 'next';
import CallsContent from './content';

export const metadata: Metadata = {
  title: 'Calls',
};

export default function CallsPage() {
  return <CallsContent />;
}
