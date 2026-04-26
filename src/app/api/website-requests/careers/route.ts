import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { requireWebsiteRequestsAccess } from '@/lib/website-requests-auth';

// GET /api/website-requests/careers — accessible to admins and to
// Marketing & Admissions department members. Lists submissions from
// the OpenPositions careers form (rows in public.contact_submissions
// where source='careers'). Sibling of /api/website-requests/forms
// which lists everything else.

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;

  const admin = getAdminSupabase();
  const FULL = 'id, source, first_name, last_name, email, telephone, message, page_url, referrer, status, notes, created_at, responded_at, responded_by, responded_note';
  const MIN  = 'id, source, first_name, last_name, email, telephone, message, page_url, referrer, status, notes, created_at';
  let resp = await admin.from('contact_submissions').select(FULL).eq('source', 'careers').order('created_at', { ascending: false });
  if (resp.error && /responded_/i.test(resp.error.message)) {
    console.warn('[careers] responded_* columns missing, degrading read:', resp.error.message);
    const fb = await admin.from('contact_submissions').select(MIN).eq('source', 'careers').order('created_at', { ascending: false });
    resp = fb as typeof resp;
  }
  const { data, error } = resp;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as Array<Record<string, unknown> & { responded_by?: string | null }>;
  const responderIds = Array.from(new Set(rows.map((r) => r.responded_by).filter((v): v is string => !!v)));
  const responderNames = new Map<string, string>();
  const responderAvatars = new Map<string, string>();
  if (responderIds.length > 0) {
    const { data: usrs } = await admin.from('users').select('id, full_name, avatar_url').in('id', responderIds);
    for (const u of usrs ?? []) {
      if (u.full_name) responderNames.set(u.id, u.full_name);
      if (u.avatar_url) responderAvatars.set(u.id, u.avatar_url);
    }
  }
  const shaped = rows.map((r) => ({
    ...r,
    responded_at: (r.responded_at as string | null | undefined) ?? null,
    responded_by: r.responded_by ?? null,
    responded_note: (r.responded_note as string | null | undefined) ?? null,
    responder_name: r.responded_by ? responderNames.get(r.responded_by) ?? null : null,
    responder_avatar_url: r.responded_by ? responderAvatars.get(r.responded_by) ?? null : null,
  }));

  return NextResponse.json({ rows: shaped, total: shaped.length });
}
