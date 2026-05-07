import type { Metadata } from 'next';
import OutreachContent from '../outreach/OutreachContent';

export const metadata: Metadata = {
  title: 'Forums - Patient Portal',
};

export default function ForumsPage() {
  return <OutreachContent channel="forum" />;
}
