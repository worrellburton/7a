import type { Metadata } from 'next';
import AnalyticsOverviewContent from './content';

export const metadata: Metadata = {
  title: 'Content analytics',
};

export default function Page() {
  return <AnalyticsOverviewContent />;
}
