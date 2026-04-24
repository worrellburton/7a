import type { Metadata } from 'next';
import CareersContent from './content';

export const metadata: Metadata = {
  title: 'Careers - Website Requests - Patient Portal',
};

export default function CareersPage() {
  return <CareersContent />;
}
