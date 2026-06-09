import type { Metadata } from 'next';
import PlacementsContent from '../placements/PlacementsContent';

export const metadata: Metadata = {
  title: 'Web 2.0 placements - Feather',
};

export default function Web2PlacementsPage() {
  return <PlacementsContent channel="web2_0" />;
}
