import type { Metadata } from 'next';
import AlumniRosterLoader from './Loader';

export const metadata: Metadata = {
  title: 'Alumni — Feather',
};

export default function AlumniRosterPage() {
  return <AlumniRosterLoader />;
}
