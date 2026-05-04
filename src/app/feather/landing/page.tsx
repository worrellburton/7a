import type { Metadata } from 'next';
import LandingContent from './content';

export const metadata: Metadata = {
  title: 'Landing - Patient Portal',
};

export default function LandingPage() {
  return <LandingContent />;
}
