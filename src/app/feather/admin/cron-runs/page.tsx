import type { Metadata } from 'next';
import CronRunsContent from './content';

export const metadata: Metadata = { title: 'Cron runs · Admin' };

export default function CronRunsPage() {
  return <CronRunsContent />;
}
