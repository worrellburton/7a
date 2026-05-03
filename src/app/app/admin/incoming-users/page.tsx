import type { Metadata } from 'next';
import IncomingUsersContent from './content';

export const metadata: Metadata = {
  title: 'Incoming Users — Admin',
};

export default function IncomingUsersPage() {
  return <IncomingUsersContent />;
}
