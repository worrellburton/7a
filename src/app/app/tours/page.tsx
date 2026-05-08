import type { Metadata } from 'next';
import ToursContent from './content';

export const metadata: Metadata = {
  title: 'Tours - Feather',
};

export default function ToursPage() {
  return <ToursContent />;
}
