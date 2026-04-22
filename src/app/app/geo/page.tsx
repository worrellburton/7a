import type { Metadata } from 'next';
import GeoContent from './content';

export const metadata: Metadata = {
  title: 'GEO - Patient Portal',
};

export default function GeoPage() {
  return <GeoContent />;
}
