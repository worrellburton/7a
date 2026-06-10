import { redirect } from 'next/navigation';

// Pages admin moved under /app/admin/pages alongside the rest of the
// platform-config surfaces. This thin redirect keeps any deep-linked
// bookmarks / nav badges working.
export default function PagesRedirect() {
  redirect('/feather/admin/pages');
}
