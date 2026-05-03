import type { Metadata } from 'next';
import IncomingUsersContent from './content';

export const metadata: Metadata = {
  title: 'Incoming Users',
};

export default function IncomingUsersPage() {
  return <IncomingUsersContent />;
}
