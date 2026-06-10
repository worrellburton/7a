import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { getAdminSupabase } from '@/lib/supabase-server';

// GET /api/seo/next-config
//
// PUBLIC (no auth) download of the deployed next.config.mjs. Surfaced
// as a button on the internal /feather/seo page, but the endpoint itself
// is intentionally open per product decision — the file carries no
// secrets (every sensitive value is a process.env.* reference, never
// an inlined credential).
//
// Source of truth, in order:
//   1. The live file on disk (process.cwd()/next.config.mjs) — always
//      reflects the currently-deployed codebase. Bundled into this
//      function via outputFileTracingIncludes in next.config.mjs.
//   2. Fallback: the latest row in seo_config_snapshots (written by
//      the 6 AM cron) if the disk read fails for any reason.
//
// Returns text/plain with a Content-Disposition attachment so a click
// downloads the file rather than rendering it inline.

export const dynamic = 'force-dynamic';

export async function GET() {
  let content: string | null = null;

  // 1. Live file — the canonical "current code base" copy.
  try {
    content = await readFile(path.join(process.cwd(), 'next.config.mjs'), 'utf8');
  } catch {
    content = null;
  }

  // 2. Fallback to the most recent cron snapshot.
  if (!content) {
    try {
      const admin = getAdminSupabase();
      const { data } = await admin
        .from('seo_config_snapshots')
        .select('content')
        .order('captured_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      content = (data?.content as string | null) ?? null;
    } catch {
      content = null;
    }
  }

  if (!content) {
    return NextResponse.json({ error: 'next.config.mjs is not available right now.' }, { status: 503 });
  }

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="next.config.mjs"',
      // Let the CDN hold it briefly; the cron only changes it daily and
      // deploys bust it anyway.
      'Cache-Control': 'public, max-age=300',
    },
  });
}
