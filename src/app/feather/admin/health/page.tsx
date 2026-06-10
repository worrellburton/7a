import type { Metadata } from 'next';
import HealthContent from './content';

export const metadata: Metadata = {
  title: 'Health · Feather',
};

export default function HealthPage() {
  return <HealthContent />;
}
