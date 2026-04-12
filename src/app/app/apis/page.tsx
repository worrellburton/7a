import type { Metadata } from 'next';
import APIsContent from './content';

export const metadata: Metadata = {
  title: 'APIs - Patient Portal',
};

export default function APIsPage() {
  return <APIsContent />;
}
