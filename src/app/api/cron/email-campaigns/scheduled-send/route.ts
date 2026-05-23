import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';

// GET /api/cron/email-campaigns/scheduled-send
//
// Vercel cron (every minute). Finds campaigns in status='scheduled'
// whose scheduled_send_at has passed and fires them through the
// existing /api/email-campaigns/send endpoint. Each campaign is
// flipped to 'sending' atomically before we POST, so a slow run +
// the next tick of the cron can't double-fire the same campaign.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Vercel-signed crons set x-vercel-cron=1. We also accept a
  // manual trigger with the CRON_SECRET so admins can fire the
  // route from curl when debugging without auth.
  const cronHeader = req.headers.get('x-vercel-cron') === '1';
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const queryAuth = req.nextUrl.searchParams.get('secret');
  const tokenOk =
    cronSecret != null && cronSecret.length > 0 && (authHeader === cronSecret || queryAuth === cronSecret);
  if (!cronHeader && !tokenOk) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = getAdminSupabase();
  const nowIso = new Date().toISOString();

  // Pick up campaigns whose scheduled time has passed. Limit at 20
  // per tick so a stuck campaign doesn't block the rest of the
  // queue, and so a single cron run can't run for several minutes.
  const { data: due, error } = await admin
    .from('email_campaigns')
    .select('id, scheduled_send_at, generated_subject, created_by')
    .eq('status', 'scheduled')
    .lte('scheduled_send_at', nowIso)
    .order('scheduled_send_at', { ascending: true })
    .limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (due ?? []) as Array<{ id: string; scheduled_send_at: string; generated_subject: string | null; created_by: string | null }>;
  if (rows.length === 0) return NextResponse.json({ ok: true, fired: 0 });

  // Claim each row by flipping status to 'sending' with a guard on
  // the previous status, so two cron invocations racing for the
  // same row can't both win.
  const claimed: typeof rows = [];
  for (const r of rows) {
    const { data: updated, error: claimErr } = await admin
      .from('email_campaigns')
      .update({ status: 'sending' })
      .eq('id', r.id)
      .eq('status', 'scheduled')
      .select('id')
      .maybeSingle();
    if (!claimErr && updated) claimed.push(r);
  }

  const origin = req.nextUrl.origin;
  const sendUrl = `${origin}/api/email-campaigns/send`;
  let fired = 0;
  let failed = 0;
  for (const r of claimed) {
    try {
      const res = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': cronSecret ?? '',
          'x-vercel-cron': '1',
        },
        body: JSON.stringify({ campaignId: r.id, actingUserId: r.created_by ?? null }),
      });
      if (res.ok) fired += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }

  return NextResponse.json({ ok: true, fired, failed, claimed: claimed.length });
}
