import { redirect } from 'next/navigation';

// /app/seo redirects straight to the Activities tab — that's the
// landing surface admins want by default (live feed of every SEO
// edit across the team). The standalone Search-Console summary
// content used to render here; it's still reachable from the WIP
// dropdown if anyone needs to revive it.
export default function SeoPage() {
  redirect('/app/seo/actions');
}
