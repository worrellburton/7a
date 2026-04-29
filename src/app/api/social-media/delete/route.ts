import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { requireWebsiteRequestsAccess } from '@/lib/website-requests-auth';
import { ayrshareDelete, AyrshareNotConfigured } from '@/lib/ayrshare';

// POST /api/social-media/delete
//   body: { id: string }    // Ayrshare post id (the `id` field from /history)
//
// Cancels a scheduled post or removes the historical record. Ayrshare's
// own /delete endpoint takes the id in the body, so we forward it
// straight through. We use POST on our side so the client-side fetch
// can carry a JSON body without the "DELETE-with-body" quirks some
// browsers / Next dev servers stumble over.

export const dynamic = 'force-dynamic';

type Body = { id?: string };

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;

  let body: Body;
  try { body = (await req.json()) as Body; } catch { body = {}; }
  const id = (body.id ?? '').trim();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const { status, body: result } = await ayrshareDelete('/delete', { id });
    return NextResponse.json(result, { status });
  } catch (err) {
    if (err instanceof AyrshareNotConfigured) {
      return NextResponse.json({ error: 'Ayrshare is not configured.' }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
