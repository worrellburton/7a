import type { Metadata } from 'next';
import AdmissionsContent from './content';

export const metadata: Metadata = {
  title: 'Admissions - Patient Portal',
};

export default function AdmissionsPage() {
  return <AdmissionsContent />;
}
