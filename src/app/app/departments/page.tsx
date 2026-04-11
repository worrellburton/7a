import type { Metadata } from 'next';
import DepartmentsContent from './content';

export const metadata: Metadata = {
  title: 'Departments - Patient Portal',
};

export default function DepartmentsPage() {
  return <DepartmentsContent />;
}
