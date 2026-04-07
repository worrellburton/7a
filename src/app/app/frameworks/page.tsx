import type { Metadata } from 'next';
import FrameworksContent from './content';

export const metadata: Metadata = {
  title: 'Frameworks - Patient Portal',
};

export default function FrameworksPage() {
  return <FrameworksContent />;
}
