import type { Metadata } from 'next';
import InsightsContent from './content';

export const metadata: Metadata = {
  title: 'Insights · Patient Portal',
};

export default function InsightsPage() {
  return <InsightsContent />;
}
