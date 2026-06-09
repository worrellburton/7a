import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { getAdminSupabase } from '@/lib/supabase-server';
import { withCronLogging } from '@/lib/cron-observability';

// GET /api/cron/seo/next-config-snapshot
//
// Vercel cron, daily at 6 AM Phoenix (13:00 UTC — see vercel.json).
// Reads the deployed next.config.mjs off disk and records a snapshot
// row in seo_config_snapshots, so the public download route always has
// a fresh copy and the SEO page can show a dated history.
//
// Idempotent: only inserts when the content differs from the most
// recent snapshot, so a day with no config change doesn't pile up
// identical rows.
//
// Auth: Vercel cron's x-vercel-cron header, or an Authorization
// Bearer matching CRON_SECRET for manual "run now" triggers.

export const dynamic = 'force-dynamic';

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (req.headers.get('x-vercel-cron')) return true;
  if (!secret) return false;
  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  return withCronLogging('/api/cron/seo/next-config-snapshot', async () => {
    if (!authorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let content: string;
    try {
      content = await readFile(path.join(process.cwd(), 'next.config.mjs'), 'utf8');
    } catch (e) {
      return NextResponse.json(
        { error: `Could not read next.config.mjs: ${e instanceof Error ? e.message : String(e)}` },
        { status: 500 },
      );
    }

    const admin = getAdminSupabase();
    // Skip the insert when nothing changed since the last snapshot.
    const { data: latest } = await admin
      .from('seo_config_snapshots')
      .select('content')
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest && (latest.content as string) === content) {
      return NextResponse.json({ ok: true, changed: false, bytes: content.length });
    }

    const { error } = await admin
      .from('seo_config_snapshots')
      .insert({ filename: 'next.config.mjs', content, byte_size: content.length });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, changed: true, bytes: content.length });
  });
}
