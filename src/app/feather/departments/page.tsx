import { redirect } from 'next/navigation';

// Moved under /app/admin/departments.
export default function DepartmentsRedirect() {
  redirect('/feather/admin/departments');
}
