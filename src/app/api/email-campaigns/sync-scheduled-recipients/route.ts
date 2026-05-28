import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-gates';

// POST /api/email-campaigns/sync-scheduled-recipients
//
// For every campaign currently in status='scheduled', finds contacts
// added (created_at > campaign.recipients_locked_at) that aren't
// already on the campaign's recipient list, and inserts them so the
// campaign's send fan-out sweeps them up at send time.
//
// Filters applied to candidate contacts:
//   - email IS NOT NULL AND email <> ''
//   - unsubscribed_at IS NULL (do not re-engage someone who opted out)
//
// Idempotent: the email_campaign_recipients_unique partial index
// (campaign_id, contact_id) catches re-runs; we use upsert with
// ignoreDuplicates so a partial failure can be retried.

export const dynamic = 'force-dynamic';

interface SyncReport {
  campaignId: string;
  prompt: string | null;
  recipientsLockedAt: string | null;
  newContactsConsidered: number;
  added: number;
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req, 'Only admins can sync scheduled-campaign recipients.');
  if (gate instanceof NextResponse) return gate;
  const admin = gate.admin;

  const { data: campaigns, error: campaignsErr } = await admin
    .from('email_campaigns')
    .select('id, prompt, recipients_locked_at, updated_at')
    .eq('status', 'scheduled');
  if (campaignsErr) return NextResponse.json({ error: campaignsErr.message }, { status: 500 });

  const report: SyncReport[] = [];
  let totalAdded = 0;

  for (const campaign of campaigns ?? []) {
    // Fall back to updated_at if the lock column is empty — that
    // matches the backfill in 20260528_email_campaigns_recipients_locked_at.sql
    // so old scheduled rows still behave predictably.
    const cutoff = (campaign.recipients_locked_at ?? campaign.updated_at) as string | null;
    if (!cutoff) {
      report.push({
        campaignId: campaign.id as string,
        prompt: (campaign.prompt as string | null) ?? null,
        recipientsLockedAt: null,
        newContactsConsidered: 0,
        added: 0,
      });
      continue;
    }

    const { data: contacts, error: contactsErr } = await admin
      .from('contacts')
      .select('id, email, unsubscribed_at, created_at')
      .gt('created_at', cutoff)
      .not('email', 'is', null)
      .is('unsubscribed_at', null);
    if (contactsErr) return NextResponse.json({ error: contactsErr.message }, { status: 500 });

    const candidates = (contacts ?? []).filter(
      (c): c is { id: string; email: string; unsubscribed_at: null; created_at: string } =>
        typeof c.email === 'string' && c.email.trim().length > 0,
    );

    if (candidates.length === 0) {
      report.push({
        campaignId: campaign.id as string,
        prompt: (campaign.prompt as string | null) ?? null,
        recipientsLockedAt: cutoff,
        newContactsConsidered: 0,
        added: 0,
      });
      continue;
    }

    const rows = candidates.map((c) => ({
      campaign_id: campaign.id,
      contact_id: c.id,
      email: c.email.trim(),
      send_status: 'pending' as const,
    }));

    // upsert with ignoreDuplicates so any contact already on the
    // list (manual add, prior sync run) doesn't blow up the batch.
    const { error: upsertErr, count } = await admin
      .from('email_campaign_recipients')
      .upsert(rows, { onConflict: 'campaign_id,contact_id', ignoreDuplicates: true, count: 'exact' });
    if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

    const addedHere = count ?? 0;
    totalAdded += addedHere;
    report.push({
      campaignId: campaign.id as string,
      prompt: (campaign.prompt as string | null) ?? null,
      recipientsLockedAt: cutoff,
      newContactsConsidered: candidates.length,
      added: addedHere,
    });
  }

  return NextResponse.json({
    ok: true,
    scheduledCampaigns: campaigns?.length ?? 0,
    totalAdded,
    report,
  });
}
