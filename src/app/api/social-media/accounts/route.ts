import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { requireWebsiteRequestsAccess } from '@/lib/website-requests-auth';
import { ayrshareGet, AyrshareNotConfigured, extractAyrshareError } from '@/lib/ayrshare';

// GET /api/social-media/accounts
//
// Returns the list of social-account connections for the active
// Ayrshare User Profile. Powers the "Connected accounts" strip on
// the Social Media page so we can show which platforms have been
// linked + whether the connection is still healthy.
//
// Reuses the Marketing & Admissions gate — same audience as VOBs
// and Landing.

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;

  try {
    const { status, body } = await ayrshareGet('/user');
    if (status >= 400) {
      return NextResponse.json(
        { error: extractAyrshareError(body, status, '/user') },
        { status: 502 },
      );
    }
    // Ayrshare's /user response includes activeSocialAccounts (string[])
    // for the linked profile. Surface that plus the rest as-is so the
    // UI can also read display names, follower counts, etc.
    return NextResponse.json({
      activeSocialAccounts: Array.isArray(body.activeSocialAccounts) ? body.activeSocialAccounts : [],
      displayNames: typeof body.displayNames === 'object' && body.displayNames !== null ? body.displayNames : {},
      socialAccounts: typeof body.socialAccounts === 'object' && body.socialAccounts !== null ? body.socialAccounts : {},
      raw: body,
    });
  } catch (err) {
    if (err instanceof AyrshareNotConfigured) {
      return NextResponse.json({ error: 'Ayrshare is not configured. Set AYRSHARE_API_KEY in Vercel.' }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
