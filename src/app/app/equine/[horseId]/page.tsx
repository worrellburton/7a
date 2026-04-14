import type { Metadata } from 'next';
import HorseContent from './content';

export const metadata: Metadata = {
  title: 'Horse',
};

export default function HorsePage() {
  return <HorseContent />;
}
