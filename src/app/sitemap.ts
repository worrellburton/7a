import fs from 'node:fs';
import path from 'node:path';
import type { MetadataRoute } from 'next';
import { getAdminSupabase } from '@/lib/supabase-server';
import { getPublishedBlogEpisodes, getHiddenSlugs } from '@/lib/episodes';

// Dynamic sitemap. Walks src/app/(site) at build/request time to
// enumerate every static page.tsx route, then layers in DB-backed
// dynamic routes (team-member detail pages). New static pages
// auto-include — no manual sitemap edit required.
//
// Replaces the hand-maintained public/sitemap.xml that drifted
// behind reality (43 entries vs. 59+ actual pages — privacy
// policy, terms, every blog post, several conditions).

const ORIGIN = 'https://sevenarrowsrecoveryarizona.com';

// Per-route priority + changefreq overrides. Anything not listed
// falls back to 0.6 / monthly (good defaults for inner pages).
// Matches the conventions from the old hand-curated sitemap.
const ROUTE_META: Record<string, { priority: number; changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never' }> = {
  '/': { priority: 1.0, changeFrequency: 'weekly' },
  '/admissions': { priority: 0.9, changeFrequency: 'weekly' },
  '/treatment': { priority: 0.9, changeFrequency: 'monthly' },
  '/our-program': { priority: 0.9, changeFrequency: 'monthly' },
  '/who-we-are': { priority: 0.8, changeFrequency: 'monthly' },
  '/who-we-are/faqs': { priority: 0.85, changeFrequency: 'monthly' },
  '/who-we-are/blog': { priority: 0.7, changeFrequency: 'weekly' },
  '/contact': { priority: 0.85, changeFrequency: 'monthly' },
  '/tour': { priority: 0.8, changeFrequency: 'monthly' },
  '/what-we-treat': { priority: 0.85, changeFrequency: 'monthly' },
  '/insurance': { priority: 0.8, changeFrequency: 'monthly' },
  '/locations': { priority: 0.7, changeFrequency: 'monthly' },
  '/privacy-policy': { priority: 0.3, changeFrequency: 'yearly' },
  '/terms': { priority: 0.3, changeFrequency: 'yearly' },
};

function walkPages(dir: string, prefix: string, out: string[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  // If this directory has a page.tsx (or .ts/.jsx/.js), it's a route.
  const hasPage = entries.some(
    (e) => e.isFile() && /^page\.(tsx|ts|jsx|js)$/.test(e.name),
  );
  if (hasPage) {
    out.push(prefix === '' ? '/' : prefix);
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    // Skip route groups like (site) — they don't add to the path.
    if (e.name.startsWith('(') && e.name.endsWith(')')) {
      walkPages(path.join(dir, e.name), prefix, out);
      continue;
    }
    // Skip dynamic segments [slug] — handled separately via DB queries
    // or simply omitted from the sitemap.
    if (e.name.startsWith('[') && e.name.endsWith(']')) continue;
    // Skip private / underscore-prefixed and invisible folders.
    if (e.name.startsWith('_') || e.name.startsWith('.')) continue;
    walkPages(path.join(dir, e.name), `${prefix}/${e.name}`, out);
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteRoot = path.join(process.cwd(), 'src', 'app', '(site)');
  const routes: string[] = [];
  walkPages(siteRoot, '', routes);

  // Sort for deterministic output (Search Console diffs cleanly).
  routes.sort();

  // Build the static-route entries.
  const now = new Date();
  const items: MetadataRoute.Sitemap = routes.map((r) => {
    const meta = ROUTE_META[r];
    const priority = meta?.priority ?? deriveDefaultPriority(r);
    return {
      url: `${ORIGIN}${r === '/' ? '' : r}`,
      lastModified: now,
      changeFrequency: meta?.changeFrequency ?? 'monthly',
      priority,
    };
  });

  // Layer in dynamic /who-we-are/meet-our-team/<slug> pages from
  // the users table. Best-effort — failure here doesn't break the
  // static sitemap.
  try {
    const admin = getAdminSupabase();
    const { data } = await admin
      .from('users')
      .select('public_slug, public_team')
      .eq('public_team', true)
      .not('public_slug', 'is', null);
    for (const row of (data ?? []) as Array<{ public_slug: string | null }>) {
      if (!row.public_slug) continue;
      items.push({
        url: `${ORIGIN}/who-we-are/meet-our-team/${row.public_slug}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }
  } catch {
    // Swallow — admin client unavailable in some preview contexts.
  }

  // Layer in published DB-backed blog posts — the "Recovery Roadmap"
  // episodes served by the /who-we-are/blog/[slug] dynamic route. The
  // filesystem walk above only sees the handful of hand-coded static
  // blog folders; the AI-pipeline posts live solely in the `blogs`
  // table, so without this block they never reach the sitemap (or
  // Search Console). Visibility-hidden slugs are excluded, and any slug
  // that also has a static folder is skipped so it isn't listed twice
  // (static routes take precedence in Next.js). Best-effort — failure
  // here must not break the static sitemap.
  try {
    const [episodes, hidden] = await Promise.all([
      getPublishedBlogEpisodes(),
      getHiddenSlugs(),
    ]);
    const alreadyEmitted = new Set(routes);
    for (const ep of episodes) {
      if (hidden.has(ep.slug)) continue;
      // Articles live at root level now (ep.href when set, which the
      // DB mapping always sets) — never the retired /who-we-are/blog/
      // prefix.
      const routePath = ep.href ?? `/${ep.slug}`;
      if (alreadyEmitted.has(routePath)) continue;
      items.push({
        url: `${ORIGIN}${routePath}`,
        lastModified: ep.publishedAt ? new Date(ep.publishedAt) : now,
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }
  } catch {
    // Swallow — admin client unavailable in some preview contexts.
  }

  return items;
}

// Reasonable priority for routes the override map doesn't cover.
// Top-level routes (one segment) get 0.7; deeper routes drop to
// 0.6 / 0.5 by depth so the homepage + main sections rank above
// long-tail pages like /what-we-treat/cocaine.
function deriveDefaultPriority(routePath: string): number {
  const depth = routePath.split('/').filter(Boolean).length;
  if (depth <= 1) return 0.7;
  if (depth === 2) return 0.6;
  return 0.5;
}
