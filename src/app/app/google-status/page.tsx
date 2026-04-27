import type { Metadata } from 'next';
import GoogleStatusContent from './content';

export const metadata: Metadata = {
  title: 'Google API Status',
};

export default function GoogleStatusPage() {
  return <GoogleStatusContent />;
}
