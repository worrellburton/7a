import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-gates';

// DELETE /api/email-campaigns/[id]
//
// Hard-deletes a campaign + all its analytics. Foreign keys on
// email_campaign_recipients, email_campaign_sends, and
// email_campaign_events cascade on email_campaigns(id) so a
// single DELETE on the parent row wipes the entire send history.
//
// Admin-only — a campaign delete is irreversible and there is no
// undo (the campaign data is gone, the per-recipient send/open/
// click counts are gone, the contact_logs entries that were
// written when the campaign sent stay on the contacts so the
// outreach grid still shows the touchpoint).

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin(req, 'Only admins can delete email campaigns.');
  if (gate instanceof NextResponse) return gate;
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

  // Confirm the row exists so we can return a clean 404 instead of
  // a "deleted 0 rows" silent success.
  const { data: existing, error: lookupErr } = await gate.admin
    .from('email_campaigns')
    .select('id, generated_subject, status')
    .eq('id', id)
    .maybeSingle();
  if (lookupErr) return NextResponse.json({ error: lookupErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });

  const { error: delErr } = await gate.admin
    .from('email_campaigns')
    .delete()
    .eq('id', id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, deleted: { id, subject: existing.generated_subject ?? null } });
}
