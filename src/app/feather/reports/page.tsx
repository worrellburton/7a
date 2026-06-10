import type { Metadata } from 'next';
import ReportsContent from './content';

export const metadata: Metadata = {
  title: 'Reports - Feather',
};

export default function ReportsPage() {
  return <ReportsContent />;
}
