import { redirect } from 'next/navigation';

// Moved under /feather/admin/departments.
export default function DepartmentsRedirect() {
  redirect('/feather/admin/departments');
}
