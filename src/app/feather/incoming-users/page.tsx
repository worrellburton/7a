import { redirect } from 'next/navigation';

// Moved under /feather/admin/incoming-users.
export default function IncomingUsersRedirect() {
  redirect('/feather/admin/incoming-users');
}
