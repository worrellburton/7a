import type { Metadata } from 'next';
import DirectoriesContent from './content';

export const metadata: Metadata = {
  title: 'Directories - Feather',
};

export default function DirectoriesPage() {
  return <DirectoriesContent />;
}
