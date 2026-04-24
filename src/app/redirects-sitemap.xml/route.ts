import type { NextRequest } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';

// GET /redirects-sitemap.xml
//
// Sitemap of every *legacy* path still served by our 301/302 registry.
// We hand this to Google Search Console so the crawler revisits the
// old WordPress URLs and observes the permanent redirects, which is
// what transfers link equity onto the new Next.js URLs.
//
// Source of truth is the `redirects` table (enabled rows only). The
// host in each <loc> is pulled from the incoming request so the same
// route works whether Google fetches it at sevenarrowsrecovery.com or
// sevenarrowsrecoveryarizona.com.

export const dynamic = 'force-dynamic';

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('redirects')
    .select('from_path, updated_at')
    .eq('enabled', true)
    .order('from_path', { ascending: true });

  if (error) {
    console.warn('[redirects-sitemap] query failed:', error.message);
  }

  const rows = (data ?? []).filter(
    (r): r is { from_path: string; updated_at: string | null } =>
      typeof r.from_path === 'string' && r.from_path.startsWith('/')
  );

  const urls = rows
    .map((r) => {
      const loc = xmlEscape(`${origin}${r.from_path}`);
      const lastmod = r.updated_at ? `<lastmod>${r.updated_at}</lastmod>` : '';
      return `  <url><loc>${loc}</loc>${lastmod}<changefreq>yearly</changefreq><priority>0.1</priority></url>`;
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      // Crawlers hit this rarely; let a CDN cache it briefly but allow
      // quick recovery after an admin edit.
      'cache-control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
    },
  });
}
