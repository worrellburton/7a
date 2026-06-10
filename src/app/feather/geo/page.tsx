import type { Metadata } from 'next';
import GeoContent from './content';

export const metadata: Metadata = {
  title: 'GEO - Feather',
};

export default function GeoPage() {
  return <GeoContent />;
}
