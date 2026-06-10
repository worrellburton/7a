import type { Metadata } from 'next';
import AlumniHubContent from './content';

export const metadata: Metadata = {
  title: 'Alumni hub · Feather',
};

export default function AlumniHubPage() {
  return <AlumniHubContent />;
}
