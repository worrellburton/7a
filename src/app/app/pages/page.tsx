import type { Metadata } from 'next';
import PagesContent from './content';

export const metadata: Metadata = {
  title: 'Pages - Patient Portal',
};

export default function PagesPage() {
  return <PagesContent />;
}
