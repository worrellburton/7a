import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { requireWebsiteRequestsAccess } from '@/lib/website-requests-auth';

// POST /api/website-requests/vob-mark-seen
//   body: { ids: string[] }
//
// Mark the listed VOB submissions as "seen by me" for the current
// admin. Used by the VOBs panel to drop the NEW status badge once
// the admin has loaded the page — the badge clears on their next
// visit, so this turn the badges still render. Insert is
// idempotent via the composite primary key.

export const dynamic = 'force-dynamic';

type Body = { ids?: unknown };

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;
  const { user } = auth;

  let body: Body;
  try { body = (await req.json()) as Body; } catch { body = {}; }
  const raw = Array.isArray(body.ids) ? body.ids : [];
  // Cap at 200 to bound the size of any single request — the panel
  // only ever sends one batch on initial load, but defend against
  // a misbehaving client.
  const ids = raw
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .slice(0, 200);
  if (ids.length === 0) return NextResponse.json({ ok: true, inserted: 0 });

  const admin = getAdminSupabase();
  const rows = ids.map((vob_id) => ({ vob_id, user_id: user.id }));
  // ignoreDuplicates so re-marking a row that's already been seen is
  // a no-op rather than a uniqueness violation.
  const { error } = await admin
    .from('vob_views')
    .upsert(rows, { onConflict: 'vob_id,user_id', ignoreDuplicates: true });

  if (error) {
    // If the table doesn't exist yet (migration not applied), don't
    // 500 the page — just no-op so the panel keeps working without
    // seen-tracking. CLAUDE.md "make reads resilient" applies to
    // writes that are non-critical too.
    if (/vob_views/i.test(error.message)) {
      console.warn('[vob-mark-seen] vob_views missing, skipping:', error.message);
      return NextResponse.json({ ok: true, inserted: 0, degraded: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inserted: ids.length });
}
