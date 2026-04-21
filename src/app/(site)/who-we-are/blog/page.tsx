import { redirect } from 'next/navigation';

// Recovery Roadmap moved to its own URL — keep individual episode pages
// at /who-we-are/blog/<slug> for now, but the listing lives here:
export default function BlogPage() {
  redirect('/who-we-are/recovery-roadmap');
}
