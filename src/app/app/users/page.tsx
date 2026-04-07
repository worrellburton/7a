import type { Metadata } from 'next';
import UsersContent from './content';

export const metadata: Metadata = {
  title: 'Users - Patient Portal',
};

export default function UsersPage() {
  return <UsersContent />;
}
