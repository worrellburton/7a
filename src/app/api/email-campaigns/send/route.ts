import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/api-gates';
import { sendCampaignBatch } from '@/lib/email-campaigns-send';

// POST /api/email-campaigns/send
//
// Thin auth wrapper around sendCampaignBatch (in /lib). Two callers:
//   1) An admin clicking "Send now" in the UI — gated by
//      requireAdmin so only authorised teammates can trigger a
//      live blast.
//   2) The scheduled-send cron used to call this route over HTTP
//      with x-vercel-cron + x-cron-secret, but Vercel strips
//      x-vercel-cron on internal calls and the secret check was
//      brittle, which left scheduled campaigns stuck in 'sending'.
//      The cron now imports sendCampaignBatch and calls it
//      directly; the HTTP path stays for the admin UI only.

interface SendBody {
  campaignId?: unknown;
  batchSize?: unknown;
}

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req, 'Only admins can send email campaigns.');
  if (gate instanceof NextResponse) return gate;

  const body = (await req.json().catch(() => ({}))) as SendBody;
  const campaignId = typeof body.campaignId === 'string' ? body.campaignId : null;
  if (!campaignId) return NextResponse.json({ error: 'Missing campaignId.' }, { status: 400 });

  const batchSize =
    typeof body.batchSize === 'number' && Number.isFinite(body.batchSize) && body.batchSize > 0
      ? Math.floor(body.batchSize)
      : undefined;

  const supabase = getAdminSupabase();
  const result = await sendCampaignBatch({
    supabase,
    campaignId,
    actingUserId: gate.userId,
    batchSize,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'Send failed.' }, { status: 500 });
  }
  return NextResponse.json(result);
}
