import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/social-media-auth';
import { ayrshareDelete, extractAyrshareError, AyrshareNotConfigured } from '@/lib/ayrshare';

// POST /api/social-media/delete
//   body: { id?: string, ids?: string[], caption?, scheduleDate? }
//
// Cancels a scheduled post (or removes a historical record). A single
// logical post can map to several Ayrshare ids — per-network posting splits
// it into one post per network, each with its own id — so we accept an
// array and delete each. An id Ayrshare reports as already-gone counts as
// canceled. We record the cancellation in activity_log so the scheduled
// list (sourced from there) drops it immediately.

export const dynamic = 'force-dynamic';

type Body = { id?: string; ids?: string[]; caption?: string; scheduleDate?: string };

function looksAlreadyGone(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes('not found') || m.includes('no post') || m.includes('does not exist') || m.includes('invalid id') || m.includes("doesn't exist");
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const auth = await requireSuperAdmin(supabase);
  if (auth.response) return auth.response;

  let body: Body;
  try { body = (await req.json()) as Body; } catch { body = {}; }
  const ids = Array.from(new Set([
    ...(Array.isArray(body.ids) ? body.ids : []),
    ...(typeof body.id === 'string' ? [body.id] : []),
  ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0)));
  if (ids.length === 0) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const canceled: string[] = [];
    let lastError: string | null = null;
    for (const id of ids) {
      const { status, body: result } = await ayrshareDelete('/delete', { id });
      if (status >= 200 && status < 300) { canceled.push(id); continue; }
      const msg = extractAyrshareError(result, status, '/delete');
      if (looksAlreadyGone(msg)) { canceled.push(id); continue; }
      lastError = msg;
    }

    if (canceled.length === 0) {
      return NextResponse.json({ error: lastError ?? 'Could not cancel the post' }, { status: 502 });
    }

    if (auth.user?.id) {
      try {
        await supabase.from('activity_log').insert({
          user_id: auth.user.id,
          type: 'social.schedule_canceled',
          target_kind: 'social_post',
          target_id: null,
          target_label: body.caption ?? null,
          target_path: '/feather/social-media',
          metadata: { ayrshareId: canceled[0], ayrshareIds: canceled, caption: body.caption ?? null, scheduleDate: body.scheduleDate ?? null },
        });
      } catch { /* best-effort — never block the cancel response */ }
    }
    // 200 even on partial (some ids canceled, one stubborn) so the row
    // disappears; surface the residual error for visibility.
    return NextResponse.json({ canceled, ...(lastError ? { error: lastError } : {}) }, { status: 200 });
  } catch (err) {
    if (err instanceof AyrshareNotConfigured) {
      return NextResponse.json({ error: 'Ayrshare is not configured.' }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
