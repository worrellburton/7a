import type { Metadata } from 'next';
import ReportsLandingContent from './content';

export const metadata: Metadata = {
  title: 'Call Reports - Feather',
};

export default function CallReportsLandingPage() {
  return <ReportsLandingContent />;
}
