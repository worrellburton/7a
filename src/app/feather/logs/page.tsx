import type { Metadata } from 'next';
import DailyLogsContent from './content';

export const metadata: Metadata = {
  title: 'Daily logs',
};

export default function DailyLogsPage() {
  return <DailyLogsContent />;
}
