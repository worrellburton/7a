import type { Metadata } from 'next';
import FacilitiesContent from './content';

export const metadata: Metadata = {
  title: 'Facilities - Feather',
};

export default function FacilitiesPage() {
  return <FacilitiesContent />;
}
