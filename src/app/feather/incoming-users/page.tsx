import { redirect } from 'next/navigation';

// Moved under /app/admin/incoming-users.
export default function IncomingUsersRedirect() {
  redirect('/feather/admin/incoming-users');
}
