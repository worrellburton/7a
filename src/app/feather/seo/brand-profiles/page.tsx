import type { Metadata } from 'next';
import OutreachContent from '../outreach/OutreachContent';

export const metadata: Metadata = {
  title: 'Brand profiles - Feather',
};

export default function BrandProfilesPage() {
  return <OutreachContent channel="brand_profile" />;
}
