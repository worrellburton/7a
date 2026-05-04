import type { Metadata } from 'next';
import AnalyticsContent from './content';

export const metadata: Metadata = {
  title: 'Analytics - Patient Portal',
};

export default function AnalyticsPage() {
  return <AnalyticsContent />;
}
