import type { Metadata } from 'next';
import FormsContent from './content';

export const metadata: Metadata = {
  title: 'Forms - Website Requests - Patient Portal',
};

export default function FormsPage() {
  return <FormsContent />;
}
