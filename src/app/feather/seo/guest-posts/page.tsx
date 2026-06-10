import type { Metadata } from 'next';
import OutreachContent from '../outreach/OutreachContent';

export const metadata: Metadata = {
  title: 'Guest posts - Feather',
};

export default function GuestPostsPage() {
  return <OutreachContent channel="guest_post" />;
}
