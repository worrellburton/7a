import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, saveIntegration } from '@/lib/quickbooks';
import { getServerSupabase } from '@/lib/supabase-server';

// GET /api/quickbooks/callback?code=...&state=...&realmId=...
// Intuit redirects here after the user authorizes the app.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const realmId = url.searchParams.get('realmId');
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${url.origin}/app/finance?error=${encodeURIComponent(error)}`);
  }

  const expectedState = req.cookies.get('qbo_oauth_state')?.value;
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${url.origin}/app/finance?error=state_mismatch`);
  }

  if (!code || !realmId) {
    return NextResponse.redirect(`${url.origin}/app/finance?error=missing_params`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code, url.origin);
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    await saveIntegration(realmId, tokens, user?.id ?? null);

    const res = NextResponse.redirect(`${url.origin}/app/finance?connected=1`);
    res.cookies.delete('qbo_oauth_state');
    return res;
  } catch (err) {
    return NextResponse.redirect(
      `${url.origin}/app/finance?error=${encodeURIComponent(String(err))}`
    );
  }
}
