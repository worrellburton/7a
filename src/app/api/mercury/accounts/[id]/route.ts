import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/api-gates';

// PATCH /api/mercury/accounts/:id
//
// Toggle whether this Mercury account's transactions get pulled on
// future syncs. Body: { sync_transactions: boolean }.
//
// Balance is always refreshed regardless — we want to see cash
// position across every account on the org token even when we don't
// care to mirror individual movements (treasury, holding, etc).

export const dynamic = 'force-dynamic';

interface PatchBody {
  sync_transactions?: boolean;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperAdmin();
  if (gate instanceof NextResponse) return gate;

  const { id } = await ctx.params;
  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body.sync_transactions !== 'boolean') {
    return NextResponse.json({ error: 'sync_transactions (boolean) required' }, { status: 400 });
  }

  const { data, error } = await gate.admin
    .from('mercury_accounts')
    .update({ sync_transactions: body.sync_transactions, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, sync_transactions')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json({ ok: true, account: data });
}
