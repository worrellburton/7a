import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { generateHorseBling } from '@/lib/equine-bling';

// POST /api/equine/bling/preheat
//
// Pre-renders the bling-mode image for every horse with a source
// photo. Cached rows are skipped unless `force: true` is passed in
// the body. Returns a per-horse status array so the caller can see
// which generations succeeded, which were already cached, and which
// failed with an error message.
//
// Auth: any signed-in user (the page itself is admin-only). Uses the
// service-role admin client for storage uploads + cache writes via
// the shared generateHorseBling helper.
//
// Calls run sequentially rather than in parallel so we don't blast
// the Gemini quota with N simultaneous requests; for a small herd
// (<50) the wall-clock cost is acceptable.

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface PreheatItem {
  horse_id: string;
  name: string | null;
  status: 'cached' | 'generated' | 'skipped' | 'error';
  url?: string;
  error?: string;
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY not set on this environment.' },
      { status: 412 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { force?: boolean };
  const force = !!body.force;

  const admin = getAdminSupabase();

  const { data: horses, error } = await admin
    .from('equine')
    .select('id, name, image_url')
    .order('name', { ascending: true });
  if (error) {
    return NextResponse.json({ error: `Horse list failed: ${error.message}` }, { status: 500 });
  }

  const results: PreheatItem[] = [];
  let generated = 0;
  let cached = 0;
  let skipped = 0;
  let failed = 0;

  for (const h of (horses ?? []) as Array<{ id: string; name: string | null; image_url: string | null }>) {
    if (!h.image_url) {
      results.push({ horse_id: h.id, name: h.name, status: 'skipped', error: 'No source image' });
      skipped++;
      continue;
    }
    const r = await generateHorseBling(admin, h.id, { apiKey, force });
    if (r.ok) {
      results.push({
        horse_id: h.id,
        name: h.name,
        status: r.cached ? 'cached' : 'generated',
        url: r.url,
      });
      if (r.cached) cached++;
      else generated++;
    } else {
      results.push({ horse_id: h.id, name: h.name, status: 'error', error: r.error });
      failed++;
    }
  }

  return NextResponse.json({
    total: results.length,
    generated,
    cached,
    skipped,
    failed,
    results,
  });
}
