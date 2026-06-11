import type { Metadata } from 'next';
import HomeContent from './HomeContent';

export const metadata: Metadata = {
  title: 'Home - Feather',
};

export default function AppHomePage() {
  return <HomeContent />;
}
