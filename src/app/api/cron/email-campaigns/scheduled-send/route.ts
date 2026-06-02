import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { withCronLogging } from '@/lib/cron-observability';
import { sendCampaignBatch } from '@/lib/email-campaigns-send';

// GET /api/cron/email-campaigns/scheduled-send
//
// Vercel cron (every minute). One responsibility now:
//
//   Pick up campaigns in status='scheduled' whose
//   scheduled_send_at has passed; atomically claim each by
//   flipping to 'sending' (so a slow run + the next tick can't
//   double-fire); kick off the send.
//
// The old "inflight" path that re-picked up rows already in
// status='sending' was correct for the legacy per-recipient
// transactional /emails pipeline (where each tick drained another
// batch of pending rows). Resend Broadcasts replaces that with a
// single fan-out call per campaign — so re-picking up a 'sending'
// row meant firing the WHOLE broadcast again, which produced the
// duplicate-send bug (one recipient received the same campaign 3×).
// Recovery for a campaign genuinely stuck in 'sending' is now manual
// via "Reset failed to pending" on the finalize page.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return withCronLogging('/api/cron/email-campaigns/scheduled-send', async () => {
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

  // Pick up campaigns whose scheduled_send_at has passed. We DON'T
  // re-pick up rows already in 'sending' — see the file header for
  // why. Each row that survives the claim below gets exactly one
  // send invocation per tick; the broadcast itself is a single
  // Resend call so there's no pacing to do across ticks anymore.
  const { data: due, error: dueErr } = await admin
    .from('email_campaigns')
    .select('id, scheduled_send_at, generated_subject, created_by')
    .eq('status', 'scheduled')
    .lte('scheduled_send_at', nowIso)
    .order('scheduled_send_at', { ascending: true })
    .limit(20);
  if (dueErr) return NextResponse.json({ error: dueErr.message }, { status: 500 });
  type Row = { id: string; scheduled_send_at: string | null; generated_subject: string | null; created_by: string | null };
  const dueRows = (due ?? []) as Row[];

  // Claim newly-due rows by flipping 'scheduled' → 'sending' with
  // a guard on the previous status, so two parallel cron ticks
  // can't both fire the same campaign.
  const claimedDue: Row[] = [];
  for (const r of dueRows) {
    const { data: updated, error: claimErr } = await admin
      .from('email_campaigns')
      .update({ status: 'sending' })
      .eq('id', r.id)
      .eq('status', 'scheduled')
      .select('id')
      .maybeSingle();
    if (!claimErr && updated) claimedDue.push(r);
  }

  let fired = 0;
  let failed = 0;

  // One send call per claimed campaign. The Broadcasts pipeline
  // inside sendCampaignBatch fires the whole audience in a single
  // Resend call, so we don't pass a batch size — recipients drain
  // through Resend's queue, not through our cron loop.
  const sendBatch = async (campaignId: string, createdBy: string | null) => {
    try {
      const result = await sendCampaignBatch({
        supabase: admin,
        campaignId,
        actingUserId: createdBy ?? null,
      });
      return result.ok;
    } catch (e) {
      console.error('[cron scheduled-send] sendCampaignBatch threw', e);
      return false;
    }
  };

  for (const r of claimedDue) {
    const ok = await sendBatch(r.id, r.created_by);
    if (ok) fired += 1; else failed += 1;
  }

  return NextResponse.json({
    ok: true,
    fired,
    failed,
    claimed: claimedDue.length,
  });
  });
}
