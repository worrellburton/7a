import { permanentRedirect } from 'next/navigation';

// The /who-we-are/blog/<slug> prefix was introduced by mistake on a
// batch of 2026 posts — articles live at root level (the convention
// the other 44 follow). Root-level serving happens in (site)/[slug];
// this route 301s any old URL to its root twin. The admin-managed
// `redirects` table carries the same mappings for the known slugs
// (middleware applies them before this route renders); this catch-all
// covers stragglers and anything published to the old path by stale
// tooling.
export default async function LegacyBlogSlugRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/${slug}`);
}
