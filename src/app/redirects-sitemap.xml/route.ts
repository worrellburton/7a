import type { NextRequest } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';

// /redirects-sitemap.xml
//
// Sitemap of OLD WordPress URLs — every active row's `from_path`,
// hosted under whatever host requested it. Submit this in Search
// Console under the OLD domain property (sevenarrowsrecoveryarizona.com)
// so Google re-crawls each old path, sees the 301 from middleware.ts,
// and transfers ranking signals to the new URL.

export const dynamic = 'force-dynamic';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function emptyUrlset(): string {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const base = `${url.protocol}//${url.host}`;
  const today = new Date().toISOString().slice(0, 10);

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('redirects')
    .select('from_path')
    .eq('enabled', true);

  if (error) {
    console.warn('[redirects-sitemap] query failed:', error.message);
    return new Response(emptyUrlset(), {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }

  const seen = new Set<string>();
  const urls: string[] = [];
  for (const row of data ?? []) {
    const p = row.from_path as string | null;
    if (!p || !p.startsWith('/') || seen.has(p)) continue;
    seen.add(p);
    urls.push(
      `  <url>\n    <loc>${escapeXml(base + p)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n  </url>`
    );
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
