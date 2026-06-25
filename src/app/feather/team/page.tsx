import type { Metadata } from 'next';
import UsersContent from './content';

export const metadata: Metadata = {
  title: 'Team - Feather',
};

export default function UsersPage() {
  return <UsersContent scope="staff" />;
}
