import type { Metadata } from 'next';
import AlumniMapContent from './content';

export const metadata: Metadata = { title: 'Alumni map · Feather' };

export default function AlumniMapPage() {
  return <AlumniMapContent />;
}
