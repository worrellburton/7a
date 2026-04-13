import type { Metadata } from 'next';
import JobDescriptionsContent from './content';

export const metadata: Metadata = {
  title: 'Job Descriptions',
};

export default function JobDescriptionsPage() {
  return <JobDescriptionsContent />;
}
