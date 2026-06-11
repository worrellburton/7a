import type { Metadata } from 'next';
import LandingContent from './content';

export const metadata: Metadata = {
  title: 'Landing - Feather',
};

export default function LandingPage() {
  return <LandingContent />;
}
