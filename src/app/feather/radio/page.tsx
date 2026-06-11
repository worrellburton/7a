import type { Metadata } from 'next';
import RadioContent from './content';

export const metadata: Metadata = {
  title: 'Radio - Feather',
};

export default function RadioPage() {
  return <RadioContent />;
}
