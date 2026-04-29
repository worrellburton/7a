import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/social-media-auth';
import { ayrshareGet, AyrshareNotConfigured, extractAyrshareError } from '@/lib/ayrshare';

// GET /api/social-media/history?lastRecords=25
//
// Recent posts on the active Ayrshare User Profile. Includes both
// already-posted entries and scheduled-but-not-yet-posted ones, so
// the UI can render a unified "what's queued + what's gone out" feed.

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const supabase = await getServerSupabase();
  const auth = await requireSuperAdmin(supabase);
  if (auth.response) return auth.response;

  const url = new URL(req.url);
  const lastRecordsRaw = Number(url.searchParams.get('lastRecords') ?? '25');
  const lastRecords = Number.isFinite(lastRecordsRaw)
    ? Math.max(1, Math.min(100, Math.round(lastRecordsRaw)))
    : 25;

  try {
    const { status, body } = await ayrshareGet('/history', { lastRecords });
    if (status >= 400) {
      return NextResponse.json(
        { error: extractAyrshareError(body, status, '/history') },
        { status: 502 },
      );
    }
    // Ayrshare returns an array directly under the response on
    // success; some firmware revisions wrap it in `posts`. Normalize
    // so the client always reads `posts: [...]`.
    const posts = Array.isArray(body)
      ? body
      : Array.isArray((body as { posts?: unknown }).posts)
      ? ((body as { posts: unknown[] }).posts)
      : [];
    return NextResponse.json({ posts });
  } catch (err) {
    if (err instanceof AyrshareNotConfigured) {
      return NextResponse.json({ error: 'Ayrshare is not configured.' }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
