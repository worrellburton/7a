import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { discoverSitemap } from '@/lib/seo/sitemap';

// POST /api/seo/audit/run
// Admin-only. Runs a full crawl + audit of the live marketing site and
// returns a structured AuditResult. Subsequent phases populate the
// crawler, per-category audits, scoring, and Claude-prompt generation.
//
// Request body (JSON, all optional):
//   { origin?: string }  // defaults to https://sevenarrowsrecoveryarizona.com
//
// Response (skeleton — fields filled in by later phases):
//   {
//     origin: string,
//     score: number | null,
//     ranAt: string,
//     durationMs: number,
//     sitemap: { url, urls: string[], count } | null,
//     pages: AuditedPage[],
//     categories: { ... },
//     strengths: { title, detail }[],
//     issues: { title, detail, severity }[],
//   }

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DEFAULT_ORIGIN = 'https://sevenarrowsrecoveryarizona.com';

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let origin = DEFAULT_ORIGIN;
  try {
    const body = (await req.json().catch(() => ({}))) as { origin?: string };
    if (body.origin) {
      const u = new URL(body.origin);
      origin = `${u.protocol}//${u.host}`;
    }
  } catch {
    // ignore — fall back to default
  }

  const startedAt = Date.now();

  let sitemap: {
    url: string;
    type: string;
    urls: string[];
    count: number;
    childSitemaps: string[];
    warnings: string[];
  } | null = null;
  const issues: { title: string; detail: string; severity: 'low' | 'medium' | 'high' }[] = [];
  const strengths: { title: string; detail: string }[] = [];

  try {
    const sm = await discoverSitemap(origin);
    sitemap = {
      url: sm.url,
      type: sm.type,
      urls: sm.urls,
      count: sm.urls.length,
      childSitemaps: sm.childSitemaps,
      warnings: sm.warnings,
    };
    if (sm.urls.length > 0) {
      strengths.push({
        title: 'Sitemap reachable',
        detail: `${sm.urls.length} URLs discovered via ${sm.url}.`,
      });
    } else {
      issues.push({
        title: 'Sitemap returned no URLs',
        detail: `Resolved to ${sm.url} but parsed 0 entries. Search engines cannot rely on the sitemap to discover content.`,
        severity: 'high',
      });
    }
  } catch (err) {
    issues.push({
      title: 'Sitemap missing',
      detail: err instanceof Error ? err.message : String(err),
      severity: 'high',
    });
  }

  const result = {
    origin,
    score: null as number | null,
    ranAt: new Date(startedAt).toISOString(),
    durationMs: Date.now() - startedAt,
    sitemap,
    pages: [] as unknown[],
    categories: {} as Record<string, unknown>,
    strengths,
    issues,
    notice:
      sitemap && sitemap.count > 0
        ? `Sitemap parsed (${sitemap.count} URLs). Per-page crawler + scoring land in phases 4–17.`
        : 'Sitemap fetch incomplete. Per-page crawler + scoring land in phases 4–17.',
  };

  return NextResponse.json(result);
}
