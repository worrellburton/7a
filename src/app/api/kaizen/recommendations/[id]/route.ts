import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/api-gates';

// PATCH /api/kaizen/recommendations/[id] — soft-dismiss a row
// (so it disappears from the dashboard but the historical scan
// row stays intact for audit). Super-admin only.

export const dynamic = 'force-dynamic';

interface Body { action?: unknown }

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperAdmin(req);
  if (gate instanceof NextResponse) return gate;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Body;
  const action = typeof body.action === 'string' ? body.action : null;
  if (action !== 'dismiss') {
    return NextResponse.json({ error: "Supported actions: 'dismiss'." }, { status: 400 });
  }
  const { error } = await gate.admin
    .from('kaizen_recommendations')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
