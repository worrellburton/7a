import type { Metadata } from 'next';
import ImprovementsContent from './content';

export const metadata: Metadata = {
  title: 'Improvements - Patient Portal',
};

export default function ImprovementsPage() {
  return <ImprovementsContent />;
}
