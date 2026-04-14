import type { Metadata } from 'next';
import SuperAdminContent from './content';

export const metadata: Metadata = {
  title: 'Super Admin - Patient Portal',
};

export default function SuperAdminPage() {
  return <SuperAdminContent />;
}
