import type { Metadata } from 'next';
import PoliciesContent from './content';

export const metadata: Metadata = {
  title: 'Policies & Procedures - Patient Portal',
};

export default function PoliciesPage() {
  return <PoliciesContent />;
}
