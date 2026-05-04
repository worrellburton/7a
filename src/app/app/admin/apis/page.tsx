import type { Metadata } from 'next';
import APIsContent from './content';

export const metadata: Metadata = {
  title: 'APIs — Admin',
};

export default function APIsPage() {
  return <APIsContent />;
}
