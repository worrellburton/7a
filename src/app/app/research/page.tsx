import type { Metadata } from 'next';
import ResearchContent from './content';

export const metadata: Metadata = {
  title: 'Research - Patient Portal',
};

export default function ResearchPage() {
  return <ResearchContent />;
}
