import { NextRequest, NextResponse } from 'next/server';
import { deleteStoredToken, getStoredToken, revokeToken } from '@/lib/quickbooks';
import { requireAdmin } from '@/lib/api-gates';

// POST /api/quickbooks/disconnect?realm_id=<id>
// Revokes the refresh token at Intuit and deletes the stored row.
// Multi-tenant: one realm at a time.
export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  const url = new URL(req.url);
  const realmId = url.searchParams.get('realm_id');
  if (!realmId) return NextResponse.json({ error: 'Missing realm_id' }, { status: 400 });

  const stored = await getStoredToken(realmId);
  if (stored?.refresh_token) {
    await revokeToken(stored.refresh_token);
  }
  await deleteStoredToken(realmId);
  return NextResponse.json({ ok: true });
}
