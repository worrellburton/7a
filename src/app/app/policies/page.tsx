import type { Metadata } from 'next';
import PoliciesContent from './content';

export const metadata: Metadata = {
  title: 'Policies & Procedures - Feather',
};

export default function PoliciesPage() {
  return <PoliciesContent />;
}
