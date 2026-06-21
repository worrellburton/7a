import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/social-media-auth';
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
  const auth = await requireSuperAdmin(supabase);
  if (auth.response) return auth.response;

  let body: Body;
  try { body = (await req.json()) as Body; } catch { body = {}; }
  const id = (body.id ?? '').trim();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const { status, body: result } = await ayrshareDelete('/delete', { id });
    // Record the cancellation so the scheduled-posts list (sourced from
    // activity_log) drops this post immediately, even before Ayrshare's
    // own state catches up.
    if (status >= 200 && status < 300 && auth.user?.id) {
      try {
        await supabase.from('activity_log').insert({
          user_id: auth.user.id,
          type: 'social.schedule_canceled',
          target_kind: 'social_post',
          target_id: null,
          target_label: null,
          target_path: '/feather/social-media',
          metadata: { ayrshareId: id },
        });
      } catch { /* best-effort — never block the cancel response */ }
    }
    return NextResponse.json(result, { status });
  } catch (err) {
    if (err instanceof AyrshareNotConfigured) {
      return NextResponse.json({ error: 'Ayrshare is not configured.' }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
