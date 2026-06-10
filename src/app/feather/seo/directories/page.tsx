import type { Metadata } from 'next';
import DirectoriesLoader from './Loader';

export const metadata: Metadata = {
  title: 'Directories - Feather',
};

export default function DirectoriesPage() {
  return <DirectoriesLoader />;
}
