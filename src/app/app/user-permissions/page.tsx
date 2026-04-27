import type { Metadata } from 'next';
import UserPermissionsContent from './content';

export const metadata: Metadata = {
  title: 'User Permissions - Patient Portal',
};

export default function UserPermissionsPage() {
  return <UserPermissionsContent />;
}
