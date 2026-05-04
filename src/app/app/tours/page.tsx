import type { Metadata } from 'next';
import ToursContent from './content';

export const metadata: Metadata = {
  title: 'Tours - Patient Portal',
};

export default function ToursPage() {
  return <ToursContent />;
}
