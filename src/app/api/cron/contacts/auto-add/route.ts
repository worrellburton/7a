import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { autoAddOneContact, pickProviderFromHour } from '@/lib/contact-auto-add';
import { withCronLogging } from '@/lib/cron-observability';

// GET /api/cron/contacts/auto-add
//
// Hourly Vercel cron. Picks ONE new outreach contact via the same
// AI-suggest machinery the admissions modal uses, dedupes against
// the existing roster server-side, and inserts the row attributed
// to the root super admin (Bobby) so the activity feed shows who
// "ran" the suggestion.
//
// Provider alternates by UTC hour parity — even = Claude,
// odd = Gemini — so the leaderboard between the two stays balanced
// without us tracking state.
//
// Gated by CRON_SECRET via the standard Vercel cron header check
// (Authorization: Bearer <secret>) so a public hit can't drain
// API budget. Missing secret = open to authenticated callers only
// (the cron scheduler hits with the header set in vercel.json).
//
// Schedule lives in vercel.json:
//   { "path": "/api/cron/contacts/auto-add", "schedule": "0 * * * *" }

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

const ATTRIBUTION_EMAIL = 'bobby@sevenarrowsrecovery.com';

export async function GET(req: NextRequest) {
  return withCronLogging('/api/cron/contacts/auto-add', async () => {
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret) {
    const auth = req.headers.get('authorization') || '';
    if (auth !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const admin = getAdminSupabase();
  const { data: attributed } = await admin
    .from('users')
    .select('id')
    .eq('email', ATTRIBUTION_EMAIL)
    .maybeSingle();
  if (!attributed?.id) {
    return NextResponse.json(
      { error: `Attribution user '${ATTRIBUTION_EMAIL}' not found.` },
      { status: 500 },
    );
  }

  const provider = pickProviderFromHour();
  const result = await autoAddOneContact({
    admin,
    createdByUserId: attributed.id as string,
    provider,
    source: provider === 'gemini' ? 'cron-add-with-gemini' : 'cron-add-with-claude',
  });

  console.info(
    `[cron/contacts/auto-add] provider=${result.provider} reason=${result.reason} ` +
    `considered=${result.candidatesConsidered}` +
    (result.inserted ? ` inserted=${result.inserted.id}` : '') +
    (result.error ? ` error=${result.error.slice(0, 200)}` : ''),
  );

  return NextResponse.json(result);
  });
}
