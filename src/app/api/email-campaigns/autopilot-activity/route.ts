import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-gates';

// GET /api/email-campaigns/autopilot-activity?limit=20
//
// Drives the activity feed under the AUTOPILOT pill on
// /app/email-campaigns. Returns the most recent autopilot rows
// joined with campaign titles so the UI can render
// "Added Jane Doe (3 campaigns)" with the actual campaign names.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req, 'Admins only.');
  if (gate instanceof NextResponse) return gate;
  const admin = gate.admin;

  const limit = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10) || 20, 1), 100);

  const { data: logs, error } = await admin
    .from('email_campaign_autopilot_log')
    .select('id, contact_id, contact_name, contact_email, campaign_ids, campaign_count, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Resolve campaign titles for whatever ids appeared in the recent
  // rows. We pull the prompt as a stand-in for the title (campaigns
  // don't carry a separate display name).
  const ids = Array.from(
    new Set(((logs ?? []) as Array<{ campaign_ids: string[] }>).flatMap((l) => l.campaign_ids ?? [])),
  );
  const titles = new Map<string, string>();
  if (ids.length > 0) {
    const { data: campaigns } = await admin
      .from('email_campaigns')
      .select('id, prompt, generated_subject')
      .in('id', ids);
    for (const c of (campaigns ?? []) as Array<{ id: string; prompt: string | null; generated_subject: string | null }>) {
      const label = (c.generated_subject || c.prompt || '').trim().slice(0, 80);
      titles.set(c.id as string, label || 'Campaign');
    }
  }

  const items = ((logs ?? []) as Array<{
    id: string;
    contact_id: string | null;
    contact_name: string | null;
    contact_email: string | null;
    campaign_ids: string[];
    campaign_count: number;
    created_at: string;
  }>).map((l) => ({
    id: l.id,
    contactId: l.contact_id,
    contactName: l.contact_name,
    contactEmail: l.contact_email,
    campaignCount: l.campaign_count,
    campaigns: (l.campaign_ids ?? []).map((cid) => ({
      id: cid,
      label: titles.get(cid) ?? 'Campaign',
    })),
    createdAt: l.created_at,
  }));

  return NextResponse.json({ items });
}
