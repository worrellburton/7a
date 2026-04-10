import { NextResponse } from 'next/server';
import { loadIntegration, getQuickBooksClientId } from '@/lib/quickbooks';
import { getServerSupabase } from '@/lib/supabase-server';

// GET /api/quickbooks/status — is QuickBooks connected? Admin-only.
export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const configured = Boolean(getQuickBooksClientId());
  const integration = await loadIntegration();

  return NextResponse.json({
    configured,
    connected: Boolean(integration?.access_token && integration?.realm_id),
    realmId: integration?.realm_id ?? null,
    connectedAt: integration?.connected_at ?? null,
    expiresAt: integration?.expires_at ?? null,
  });
}
