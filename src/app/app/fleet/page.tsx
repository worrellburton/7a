import type { Metadata } from 'next';
import FleetContent from './content';

export const metadata: Metadata = {
  title: 'Fleet - Patient Portal',
};

export default function FleetPage() {
  return <FleetContent />;
}
