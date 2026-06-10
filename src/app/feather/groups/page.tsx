import type { Metadata } from 'next';
import GroupsContent from './content';

export const metadata: Metadata = {
  title: 'Groups - Feather',
};

export default function GroupsPage() {
  return <GroupsContent />;
}
