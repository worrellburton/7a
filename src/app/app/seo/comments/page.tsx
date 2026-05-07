import type { Metadata } from 'next';
import OutreachContent from '../outreach/OutreachContent';

export const metadata: Metadata = {
  title: 'Comments - Patient Portal',
};

export default function CommentsPage() {
  return <OutreachContent channel="comment" />;
}
