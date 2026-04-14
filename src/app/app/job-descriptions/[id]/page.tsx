import type { Metadata } from 'next';
import JobDescriptionDetailContent from './content';

export const metadata: Metadata = {
  title: 'Job Description',
};

export default function JobDescriptionDetailPage() {
  return <JobDescriptionDetailContent />;
}
