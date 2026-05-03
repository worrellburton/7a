import { redirect } from 'next/navigation';

// Moved under /app/admin/incoming-users.
export default function IncomingUsersRedirect() {
  redirect('/app/admin/incoming-users');
}
