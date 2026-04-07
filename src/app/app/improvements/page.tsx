import type { Metadata } from 'next';
import ImprovementsContent from './content';

export const metadata: Metadata = {
  title: 'Facilities - Patient Portal',
};

export default function ImprovementsPage() {
  return <ImprovementsContent />;
}
