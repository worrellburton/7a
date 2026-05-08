import type { Metadata } from 'next';
import AdmissionsContent from './content';

export const metadata: Metadata = {
  title: 'Admissions - Feather',
};

export default function AdmissionsPage() {
  return <AdmissionsContent />;
}
