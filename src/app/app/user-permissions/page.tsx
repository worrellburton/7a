import { redirect } from 'next/navigation';

// Moved under /app/admin/user-permissions.
export default function UserPermissionsRedirect() {
  redirect('/app/admin/user-permissions');
}
