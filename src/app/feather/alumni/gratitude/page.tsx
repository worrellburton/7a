import type { Metadata } from 'next';
import GratitudeBoardContent from './content';

export const metadata: Metadata = { title: 'Gratitude board · Feather' };

export default function GratitudePage() {
  return <GratitudeBoardContent />;
}
