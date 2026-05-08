import type { Metadata } from 'next';
import OutreachContent from '../outreach/OutreachContent';

export const metadata: Metadata = {
  title: 'Forums - Feather',
};

export default function ForumsPage() {
  return <OutreachContent channel="forum" />;
}
