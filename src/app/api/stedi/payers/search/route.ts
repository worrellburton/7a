import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { requireWebsiteRequestsAccess } from '@/lib/website-requests-auth';

// GET /api/stedi/payers/search?q=<text>
//
// Proxy to Stedi's payer-directory search so the admin UI can find
// the correct `stediId` (trading-partner service id) for an insurer
// by typing its name. The Payer ID printed on most insurance cards
// is NOT a Stedi trading-partner id — it's a CMS / Change Healthcare
// / RX BIN code. Eligibility 270 requests rejected with AAA code 79
// ("Invalid Participant Identification") are almost always this
// confusion. The picker fixes it by stamping the actual Stedi id.
//
// Required env: STEDI_API_KEY.
// Docs: https://www.stedi.com/docs/healthcare/api-reference/get-search-payers

export const dynamic = 'force-dynamic';

const STEDI_PAYER_SEARCH_URL = 'https://payers.us.stedi.com/2024-04-01/payers/search';

interface StediPayer {
  displayName?: string;
  primaryPayerId?: string;
  stediId?: string;
  aliases?: string[];
  transactionSupport?: {
    eligibilityCheck?: string;
    claimStatus?: string;
  };
}

interface StediMatch {
  matches?: { names?: string[] };
  payer?: StediPayer;
  score?: number;
}

export async function GET(req: Request) {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;

  const stediKey = process.env.STEDI_API_KEY;
  if (!stediKey) {
    return NextResponse.json(
      { error: 'STEDI_API_KEY is not configured on the server.' },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  if (q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  const upstream = new URL(STEDI_PAYER_SEARCH_URL);
  upstream.searchParams.set('query', q);
  // We only care about payers that actually support 270/271 — if a
  // payer can't be reached for eligibility, picking it would just
  // queue up another AAA-79 failure.
  upstream.searchParams.set('eligibilityCheck', 'SUPPORTED');

  const res = await fetch(upstream.toString(), {
    headers: { 'Authorization': stediKey },
  });
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `Stedi payer search failed (${res.status})`, details: text },
      { status: res.status },
    );
  }
  const data = (await res.json()) as { items?: StediMatch[]; stats?: unknown };

  // Strip the noisy <b>...</b> highlight tags Stedi returns so the
  // dropdown shows clean text.
  const items = (data.items || [])
    .map((m) => {
      const p = m.payer || {};
      return {
        stediId: p.stediId || null,
        displayName: p.displayName || (m.matches?.names?.[0] || '').replace(/<\/?b>/g, ''),
        primaryPayerId: p.primaryPayerId || null,
        aliases: p.aliases || [],
        eligibilitySupport: p.transactionSupport?.eligibilityCheck || null,
      };
    })
    .filter((p) => p.stediId)
    .slice(0, 25);

  return NextResponse.json({ items });
}
