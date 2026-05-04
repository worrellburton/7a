import type { Metadata } from 'next';
import ActivityContent from './content';

export const metadata: Metadata = {
  title: 'Activity - Patient Portal',
};

export default function ActivityPage() {
  return <ActivityContent />;
}
