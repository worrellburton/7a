import type { Metadata } from 'next';
import DirectoriesContent from './content';

export const metadata: Metadata = {
  title: 'Directories - Patient Portal',
};

export default function DirectoriesPage() {
  return <DirectoriesContent />;
}
