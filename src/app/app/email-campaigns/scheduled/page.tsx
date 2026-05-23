import type { Metadata } from 'next';
import ScheduledContent from './content';

export const metadata: Metadata = {
  title: 'Sending schedule · Email Campaigns',
};

export default function ScheduledPage() {
  return <ScheduledContent />;
}
