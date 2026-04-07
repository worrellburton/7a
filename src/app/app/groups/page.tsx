import type { Metadata } from 'next';
import GroupsContent from './content';

export const metadata: Metadata = {
  title: 'Groups - Patient Portal',
};

export default function GroupsPage() {
  return <GroupsContent />;
}
