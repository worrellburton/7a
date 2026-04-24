import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

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

  // Phase 2 stub. Phases 3+ replace these placeholder fields with real
  // crawl + audit data.
  const result = {
    origin,
    score: null as number | null,
    ranAt: new Date(startedAt).toISOString(),
    durationMs: Date.now() - startedAt,
    sitemap: null as { url: string; urls: string[]; count: number } | null,
    pages: [] as unknown[],
    categories: {} as Record<string, unknown>,
    strengths: [] as { title: string; detail: string }[],
    issues: [] as { title: string; detail: string; severity: 'low' | 'medium' | 'high' }[],
    notice: 'Audit runner scaffolded. Crawler + scoring land in phases 3–17.',
  };

  return NextResponse.json(result);
}
