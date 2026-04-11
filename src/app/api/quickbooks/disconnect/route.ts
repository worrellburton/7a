import { NextRequest, NextResponse } from 'next/server';
import { deleteStoredToken, getStoredToken, revokeToken } from '@/lib/quickbooks';
import { getServerSupabase } from '@/lib/supabase-server';

// POST /api/quickbooks/disconnect?realm_id=<id>
// Revokes the refresh token at Intuit and deletes the stored row.
// Multi-tenant: one realm at a time.
export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
