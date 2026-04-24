import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase-server';
import GoogleReconnectContent from './content';

export const metadata: Metadata = {
  title: 'Reconnect Google — Patient Portal',
};

export const dynamic = 'force-dynamic';

// Admin-only page that guides the admin through minting a fresh
// GOOGLE_OAUTH_REFRESH_TOKEN. We read the one-shot token cookie set by
// /api/google/reconnect/callback server-side so the raw refresh token
// never appears in the URL or in client-visible storage; the rendered
// response immediately clears the cookie so a reload doesn't re-expose it.
export default async function GoogleReconnectPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: row } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!row?.is_admin) redirect('/app');

  const params = await searchParams;
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('google_reconnect_token')?.value ?? null;
  const scope = cookieStore.get('google_reconnect_scope')?.value ?? null;

  // Consume the cookie: mark it for deletion on this response. Next's
  // cookies() in a Server Component is usually read-only, but the
  // page renders once per navigation, so clearing here is best-effort —
  // the 5-minute max-age on the callback is the real safety net.
  if (refreshToken) {
    try {
      cookieStore.delete({ name: 'google_reconnect_token', path: '/app/google-reconnect' });
      cookieStore.delete({ name: 'google_reconnect_scope', path: '/app/google-reconnect' });
    } catch {
      // Read-only cookie context — the short max-age will expire it anyway.
    }
  }

  const hdrs = await headers();
  const host = hdrs.get('host') ?? '';
  const proto = hdrs.get('x-forwarded-proto') ?? 'https';
  const origin = host ? `${proto}://${host}` : '';
  const redirectUri = origin ? `${origin}/api/google/reconnect/callback` : '';

  const clientConfigured =
    !!process.env.GOOGLE_OAUTH_CLIENT_ID && !!process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  return (
    <GoogleReconnectContent
      clientConfigured={clientConfigured}
      redirectUri={redirectUri}
      refreshToken={refreshToken}
      scope={scope}
      ok={params.ok === '1'}
      error={params.error ?? null}
    />
  );
}
