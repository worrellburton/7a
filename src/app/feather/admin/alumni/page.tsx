import type { Metadata } from 'next';
import AlumniAdminContent from './content';

export const metadata: Metadata = {
  title: 'Alumni — Admin',
};

export default function AlumniAdminPage() {
  return <AlumniAdminContent />;
}
