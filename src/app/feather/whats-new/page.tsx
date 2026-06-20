import type { Metadata } from 'next';
import WhatsNewContent from './content';

export const metadata: Metadata = {
  title: "What's new",
};

export default function WhatsNewPage() {
  return <WhatsNewContent />;
}
