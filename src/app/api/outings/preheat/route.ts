import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { OUTINGS } from '@/lib/outings';
import { generateOutingImage } from '@/lib/outing-image';

// POST /api/outings/preheat
//
// Walks every outing in /lib/outings.ts, asks Claude to research +
// enrich the per-outing prompt, runs the result through Gemini's
// nano-banana Pro image model, and writes the resulting URL into
// public.outings_images. Subsequent requests with an unchanged
// prompt return the cached row.
//
// Auth: signed-in admin only (the page itself is admin-only, and
// the writes need the service role).
//
// Body: { force?: boolean } — set true to bypass the cache.

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface PreheatItem {
  slug: string;
  name: string;
  status: 'cached' | 'generated' | 'error';
  url?: string;
  prompt?: string;
  researched?: boolean;
  error?: string;
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
  const results: PreheatItem[] = [];
  let generated = 0;
  let cached = 0;
  let failed = 0;

  for (const outing of OUTINGS) {
    const r = await generateOutingImage(admin, outing, { apiKey, force });
    if (r.ok) {
      results.push({
        slug: outing.slug,
        name: outing.name,
        status: r.cached ? 'cached' : 'generated',
        url: r.url,
        prompt: r.prompt,
        researched: r.researched,
      });
      if (r.cached) cached++;
      else generated++;
    } else {
      results.push({ slug: outing.slug, name: outing.name, status: 'error', error: r.error });
      failed++;
    }
  }

  return NextResponse.json({
    total: results.length,
    generated,
    cached,
    failed,
    results,
  });
}
