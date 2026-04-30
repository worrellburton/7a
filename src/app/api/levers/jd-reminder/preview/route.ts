import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/levers/jd-reminder/preview
//
// Super-admin only. Returns the list of jd_signatures rows that have
// been sent but not signed (signed_at IS NULL), joined with the
// signer's user record so the admin sees a name + email + JD title
// + how long it has been pending. Powers the live "would notify N
// users" preview on the Levers page before they pull.

export const dynamic = 'force-dynamic';

interface PendingItem {
  jd_signature_id: string;
  signer_user_id: string;
  signer_name: string | null;
  signer_email: string | null;
  jd_title: string | null;
  sent_at: string | null;
}

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Super-admin gate. The is_super_admin column on public.users
  // mirrors the admin role used elsewhere; the JD reminder lever is
  // org-wide so we keep it locked down.
  const { data: u } = await supabase
    .from('users')
    .select('is_super_admin, is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!u?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = getAdminSupabase();
  const { data: rows, error } = await admin
    .from('jd_signatures')
    .select('id, signer_user_id, signer_name, signer_email, sent_at, signed_at, job_description_id')
    .is('signed_at', null)
    .order('sent_at', { ascending: true })
    .limit(200);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Resolve JD titles in a single batch (avoids N+1).
  const jdIds = Array.from(
    new Set((rows ?? []).map((r) => r.job_description_id).filter(Boolean) as string[]),
  );
  const titleByJdId = new Map<string, string>();
  if (jdIds.length > 0) {
    const { data: jds } = await admin
      .from('job_descriptions')
      .select('id, title')
      .in('id', jdIds);
    for (const jd of (jds ?? []) as Array<{ id: string; title: string | null }>) {
      if (jd.title) titleByJdId.set(jd.id, jd.title);
    }
  }

  const items: PendingItem[] = (rows ?? []).map((r) => ({
    jd_signature_id: r.id as string,
    signer_user_id: r.signer_user_id as string,
    signer_name: (r.signer_name as string | null) ?? null,
    signer_email: (r.signer_email as string | null) ?? null,
    jd_title: r.job_description_id ? (titleByJdId.get(r.job_description_id) ?? null) : null,
    sent_at: (r.sent_at as string | null) ?? null,
  }));

  // Dedup by signer — if a teammate has two unsigned JDs they should
  // see one popup, not two. Keep the oldest (most-stale) row's
  // signature id for the metadata payload.
  const seen = new Set<string>();
  const dedup: PendingItem[] = [];
  for (const it of items) {
    if (!it.signer_user_id || seen.has(it.signer_user_id)) continue;
    seen.add(it.signer_user_id);
    dedup.push(it);
  }

  return NextResponse.json({ count: dedup.length, items: dedup });
}
