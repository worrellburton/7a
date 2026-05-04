import type { Metadata } from 'next';
import LeversContent from './content';

export const metadata: Metadata = {
  title: 'Levers',
};

export default function LeversPage() {
  return <LeversContent />;
}
