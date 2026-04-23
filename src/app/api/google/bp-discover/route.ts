import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { hasGoogleOAuth, mbAccounts, mbLocations } from '@/lib/google';

// GET /api/google/bp-discover
// Admin-only helper: lists every Business Profile account the
// authenticated refresh token can see, and every location under each.
// Use it once to copy the account id + location id into
// GOOGLE_BP_ACCOUNT_ID / GOOGLE_BP_LOCATION_ID in Vercel env.

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!hasGoogleOAuth()) {
    return NextResponse.json({ error: 'Google OAuth env not configured' }, { status: 412 });
  }

  try {
    const accounts = await mbAccounts();
    const out = await Promise.all(
      accounts.map(async (a) => {
        const accountId = a.name.replace(/^accounts\//, '');
        let locations: { id: string; title: string; storeCode?: string }[] = [];
        try {
          const locs = await mbLocations(accountId);
          locations = locs.map((l) => ({
            id: l.name.replace(/^locations\//, '').replace(/^accounts\/[^/]+\/locations\//, ''),
            title: l.title ?? '(untitled)',
            storeCode: l.storeCode,
          }));
        } catch (err) {
          locations = [];
        }
        return {
          accountId,
          accountName: a.accountName ?? '(no name)',
          type: a.type ?? '',
          locations,
        };
      }),
    );
    return NextResponse.json({ accounts: out, fetched_at: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
