import type { Metadata } from 'next';
import PlacementsContent from '../placements/PlacementsContent';

export const metadata: Metadata = {
  title: 'PDF placements - Feather',
};

export default function PdfPlacementsPage() {
  return <PlacementsContent channel="pdf" />;
}
