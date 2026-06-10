import type { Metadata } from 'next';
import UserPermissionsContent from './content';

export const metadata: Metadata = {
  title: 'User Permissions — Admin',
};

export default function UserPermissionsPage() {
  return <UserPermissionsContent />;
}
