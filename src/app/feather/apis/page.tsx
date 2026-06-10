import { redirect } from 'next/navigation';

// Moved under /app/admin/apis.
export default function APIsRedirect() {
  redirect('/feather/admin/apis');
}
