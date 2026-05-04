import type { Metadata } from 'next';
import FacilitiesContent from './content';

export const metadata: Metadata = {
  title: 'Facilities - Patient Portal',
};

export default function FacilitiesPage() {
  return <FacilitiesContent />;
}
