import type { Metadata } from 'next';
import EquineContent from './content';

export const metadata: Metadata = {
  title: 'Horses',
};

export default function EquinePage() {
  return <EquineContent />;
}
