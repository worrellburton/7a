import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/website-requests/forms  — admin-only. Lists every contact
// submission from public.contact_submissions (the table master
// authored in migration 20260423_contact_submissions.sql, extended
// by 20260424_website_requests.sql with source/consent/page_url).

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = getAdminSupabase();
  // Careers submissions live in the same table but get their own
  // /app/website-requests/careers page; exclude them here so they
  // don't double-up.
  //
  // Try the full select with responded_*; fall back if the columns
  // aren't in the deployed schema yet.
  const FULL = 'id, source, first_name, last_name, email, telephone, payment_method, message, consent, page_url, referrer, user_agent, status, notes, created_at, responded_at, responded_by';
  const MIN  = 'id, source, first_name, last_name, email, telephone, payment_method, message, consent, page_url, referrer, user_agent, status, notes, created_at';
  let resp = await admin.from('contact_submissions').select(FULL).neq('source', 'careers').order('created_at', { ascending: false });
  if (resp.error && /responded_/i.test(resp.error.message)) {
    console.warn('[forms] responded_* columns missing, degrading read:', resp.error.message);
    const fb = await admin.from('contact_submissions').select(MIN).neq('source', 'careers').order('created_at', { ascending: false });
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
    responder_name: r.responded_by ? responderNames.get(r.responded_by) ?? null : null,
    responder_avatar_url: r.responded_by ? responderAvatars.get(r.responded_by) ?? null : null,
  }));

  return NextResponse.json({ rows: shaped, total: shaped.length });
}
