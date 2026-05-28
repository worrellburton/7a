import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { withCronLogging } from '@/lib/cron-observability';
import { sendCampaignBatch } from '@/lib/email-campaigns-send';

// GET /api/cron/email-campaigns/scheduled-send
//
// Vercel cron (every minute). Two responsibilities:
//
// 1) Pick up campaigns in status='scheduled' whose
//    scheduled_send_at has passed; atomically claim each by
//    flipping to 'sending' (so a slow run + the next tick can't
//    double-fire); kick off the send.
//
// 2) Pick up campaigns already in status='sending' that still
//    have pending recipients and drain another batch. This is
//    what spreads a big campaign across multiple ticks so we
//    stay under Resend's free-tier daily cap + per-second rate.
//
// Pacing: SEND_WINDOW_MINUTES sets the desired span for one
// campaign. Each tick we send pending_count / SEND_WINDOW_MINUTES
// rows so a 236-recipient campaign with the default 10-minute
// window drains in ~10 ticks (~10 minutes). Bumps the floor to 5
// so a near-finished campaign still progresses on every tick.

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

  // Desired campaign send window in minutes. With a 1-minute cron
  // tick this also equals the number of ticks a campaign of any
  // size will take to drain — we send (pending / WINDOW) rows per
  // tick (floor of 5 so near-finished campaigns finish promptly).
  const SEND_WINDOW_MINUTES = Number(process.env.EMAIL_SEND_WINDOW_MINUTES) || 10;
  const MIN_BATCH = 5;

  // Pick up new scheduled-time-due campaigns AND any 'sending'
  // campaigns that still have work. We process them in one
  // unified pass so a single tick of the cron can both kick off a
  // freshly-due campaign AND drain another batch of an
  // in-progress one.
  const [{ data: due, error: dueErr }, { data: inflight, error: inflightErr }] = await Promise.all([
    admin
      .from('email_campaigns')
      .select('id, scheduled_send_at, generated_subject, created_by')
      .eq('status', 'scheduled')
      .lte('scheduled_send_at', nowIso)
      .order('scheduled_send_at', { ascending: true })
      .limit(20),
    admin
      .from('email_campaigns')
      .select('id, scheduled_send_at, generated_subject, created_by')
      .eq('status', 'sending')
      .order('scheduled_send_at', { ascending: true, nullsFirst: false })
      .limit(20),
  ]);
  if (dueErr) return NextResponse.json({ error: dueErr.message }, { status: 500 });
  if (inflightErr) return NextResponse.json({ error: inflightErr.message }, { status: 500 });
  type Row = { id: string; scheduled_send_at: string | null; generated_subject: string | null; created_by: string | null };
  const dueRows = (due ?? []) as Row[];
  const inflightRows = (inflight ?? []) as Row[];

  // Claim newly-due rows by flipping 'scheduled' → 'sending' with
  // a guard on the previous status. Inflight rows are already
  // 'sending' so they don't need a claim — the send endpoint
  // itself uses .eq('send_status', 'pending') as the row guard.
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

  // Send a paced batch for one campaign. Computed off the campaign's
  // CURRENT pending count, divided by the configured send window, so
  // a 236-recipient campaign with window=10 burns through 24 per
  // tick. We call sendCampaignBatch directly (no HTTP round-trip) so
  // a transient header / auth mismatch can't stall the queue.
  const sendBatch = async (campaignId: string, createdBy: string | null) => {
    const { count: pending } = await admin
      .from('email_campaign_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('send_status', 'pending');
    const remaining = pending ?? 0;
    if (remaining === 0) {
      await admin
        .from('email_campaigns')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', campaignId);
      return true;
    }
    const batchSize = Math.max(MIN_BATCH, Math.ceil(remaining / SEND_WINDOW_MINUTES));
    try {
      const result = await sendCampaignBatch({
        supabase: admin,
        campaignId,
        actingUserId: createdBy ?? null,
        batchSize,
      });
      return result.ok;
    } catch (e) {
      console.error('[cron scheduled-send] sendCampaignBatch threw', e);
      return false;
    }
  };

  // Newly-claimed campaigns: kick the first batch immediately.
  for (const r of claimedDue) {
    const ok = await sendBatch(r.id, r.created_by);
    if (ok) fired += 1; else failed += 1;
  }
  // Inflight campaigns: continue draining.
  for (const r of inflightRows) {
    // Don't double-process a campaign we just claimed in this
    // same tick (could theoretically race if the dueRows query
    // landed at the exact moment the claim happened).
    if (claimedDue.some((d) => d.id === r.id)) continue;
    const ok = await sendBatch(r.id, r.created_by);
    if (ok) fired += 1; else failed += 1;
  }

  return NextResponse.json({
    ok: true,
    fired,
    failed,
    claimed: claimedDue.length,
    inflight: inflightRows.length,
    send_window_minutes: SEND_WINDOW_MINUTES,
  });
  });
}
