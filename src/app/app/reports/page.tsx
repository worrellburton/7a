import type { Metadata } from 'next';
import ReportsContent from './content';

export const metadata: Metadata = {
  title: 'Reports - Patient Portal',
};

export default function ReportsPage() {
  return <ReportsContent />;
}
