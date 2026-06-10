import type { Metadata } from 'next';
import SpeedContent from './content';

export const metadata: Metadata = {
  title: 'Speed - SEO',
};

export default function SpeedPage() {
  return <SpeedContent />;
}
