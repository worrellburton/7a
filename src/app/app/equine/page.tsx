import type { Metadata } from 'next';
import EquineContent from './content';

export const metadata: Metadata = {
  title: 'Equine',
};

export default function EquinePage() {
  return <EquineContent />;
}
