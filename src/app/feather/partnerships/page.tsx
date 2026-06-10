import type { Metadata } from 'next';
import PartnershipsContent from './content';

export const metadata: Metadata = {
  title: 'Partnerships & Referrals',
};

export default function PartnershipsPage() {
  return <PartnershipsContent />;
}
