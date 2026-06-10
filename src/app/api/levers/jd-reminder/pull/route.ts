import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/levers/jd-reminder/pull
//
// Super-admin only. Inserts one lever_pulls row per pending signer
// (a deduplicated mirror of the preview endpoint). Each row's
// realtime INSERT fires the global JD reminder modal in the
// recipient's browser. Activity log gets a single row attributing
// the broadcast to the puller; per-recipient detail lives in the
// metadata column.

export const dynamic = 'force-dynamic';

interface PendingItem {
  signer_user_id: string;
  jd_signature_id: string;
  signer_name: string | null;
  signer_email: string | null;
  jd_title: string | null;
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: u } = await supabase
    .from('users')
    .select('is_super_admin, full_name')
    .eq('id', user.id)
    .maybeSingle();
  if (!u?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const pulledByName = (u.full_name as string | null) ?? null;
  const admin = getAdminSupabase();

  // Re-resolve the cohort server-side instead of trusting client
  // input — the admin shouldn't be able to spoof recipients.
  const { data: rows, error } = await admin
    .from('jd_signatures')
    .select('id, signer_user_id, signer_name, signer_email, job_description_id')
    .is('signed_at', null)
    .limit(500);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

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

  const seen = new Set<string>();
  const cohort: PendingItem[] = [];
  for (const r of rows ?? []) {
    const signerId = r.signer_user_id as string | null;
    if (!signerId || seen.has(signerId)) continue;
    seen.add(signerId);
    cohort.push({
      signer_user_id: signerId,
      jd_signature_id: r.id as string,
      signer_name: (r.signer_name as string | null) ?? null,
      signer_email: (r.signer_email as string | null) ?? null,
      jd_title: r.job_description_id ? (titleByJdId.get(r.job_description_id as string) ?? null) : null,
    });
  }

  if (cohort.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, recipients: [] });
  }

  const inserted = cohort.map((c) => ({
    lever_type: 'jd_reminder',
    target_user_id: c.signer_user_id,
    pulled_by: user.id,
    pulled_by_name: pulledByName,
    metadata: {
      jd_signature_id: c.jd_signature_id,
      jd_title: c.jd_title,
    },
  }));
  const { error: insertError } = await admin
    .from('lever_pulls')
    .insert(inserted);
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // One activity-log row per pull, not per recipient. Per-recipient
  // detail is in the metadata so the global feed reads as a single
  // event ("Bobby pulled JD reminder lever — sent to 7 teammates").
  await admin.from('activity_log').insert({
    user_id: user.id,
    type: 'lever.jd_reminder_pulled',
    target_kind: 'lever',
    target_id: 'jd_reminder',
    target_label: `JD reminder — sent to ${cohort.length} teammate${cohort.length === 1 ? '' : 's'}`,
    target_path: '/feather/levers',
    metadata: {
      sent: cohort.length,
      recipients: cohort.map((c) => ({
        user_id: c.signer_user_id,
        name: c.signer_name,
        email: c.signer_email,
        jd_title: c.jd_title,
      })),
    },
  });

  return NextResponse.json({
    ok: true,
    sent: cohort.length,
    recipients: cohort,
  });
}
