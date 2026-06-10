import type { Metadata } from 'next';
import DonationsContent from './content';

export const metadata: Metadata = {
  title: 'Donations - Feather',
};

export default function DonationsPage() {
  return <DonationsContent />;
}
