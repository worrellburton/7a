import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { requireWebsiteRequestsAccess } from '@/lib/website-requests-auth';

// POST /api/stedi/eligibility
//   body: { vob_id }
//
// Builds a Stedi healthcare real-time eligibility (270) request from
// the VOB row's saved insurance fields, calls Stedi, and persists the
// 271 response back on the row. Returns the parsed response to the
// caller so the UI can show benefit details inline.
//
// Required env:
//   STEDI_API_KEY  — same key the professional-claims proxy uses.
//
// Docs: https://www.stedi.com/docs/api-reference/healthcare/post-healthcare-eligibility

export const dynamic = 'force-dynamic';

// Stedi real-time eligibility (270/271). Same base path the
// professional-claims proxy in /api/stedi uses — Stedi groups every
// Change Healthcare passthrough under change/medicalnetwork/<resource>/v3.
const STEDI_URL =
  'https://healthcare.us.stedi.com/2024-04-01/change/medicalnetwork/eligibility/v3';
const STEDI_TRADING_PARTNER_ENV = 'STEDI_TRADING_PARTNER_SERVICE_ID';

const PROVIDER_DEFAULTS = {
  organizationName: 'Seven Arrows Recovery',
  npi: process.env.STEDI_PROVIDER_NPI || '',
};

type Body = { vob_id?: string };

function splitName(full: string | null | undefined): { first: string; last: string } {
  if (!full) return { first: '', last: '' };
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function dobForStedi(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return `${m[1]}${m[2]}${m[3]}`;
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;
  const { user } = auth;

  const stediKey = process.env.STEDI_API_KEY;
  if (!stediKey) {
    return NextResponse.json(
      { error: 'STEDI_API_KEY is not configured on the server.' },
      { status: 500 },
    );
  }

  let body: Body;
  try { body = (await req.json()) as Body; } catch { body = {}; }
  const vobId = body.vob_id;
  if (!vobId) return NextResponse.json({ error: 'Missing vob_id' }, { status: 400 });

  type VobStediRow = {
    id: string;
    full_name: string | null;
    date_of_birth: string | null;
    member_id: string | null;
    group_number: string | null;
    payer_id: string | null;
    payer_name: string | null;
    subscriber_first_name: string | null;
    subscriber_last_name: string | null;
    subscriber_dob: string | null;
    subscriber_relationship: string | null;
  };

  const admin = getAdminSupabase();
  const { data: rowData, error: rowErr } = await admin
    .from('vob_requests')
    .select(
      'id, full_name, date_of_birth, member_id, group_number, payer_id, payer_name, ' +
        'subscriber_first_name, subscriber_last_name, subscriber_dob, subscriber_relationship',
    )
    .eq('id', vobId)
    .maybeSingle();
  if (rowErr) return NextResponse.json({ error: rowErr.message }, { status: 500 });
  if (!rowData) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const row = rowData as unknown as VobStediRow;

  const memberId = row.member_id ?? '';
  const payerId = row.payer_id ?? '';
  const tradingPartner = payerId || process.env[STEDI_TRADING_PARTNER_ENV] || '';

  const missing: string[] = [];
  if (!memberId) missing.push('member_id');
  if (!tradingPartner) missing.push('payer_id (Stedi trading-partner service id)');
  if (!PROVIDER_DEFAULTS.npi) missing.push('STEDI_PROVIDER_NPI env');
  if (missing.length) {
    return NextResponse.json(
      { error: `Cannot run eligibility check — missing: ${missing.join(', ')}` },
      { status: 400 },
    );
  }

  const sub = splitName(
    row.subscriber_first_name || row.subscriber_last_name || row.full_name,
  );
  const subscriberFirst = row.subscriber_first_name || sub.first;
  const subscriberLast = row.subscriber_last_name || sub.last;
  const subscriberDob = dobForStedi(row.subscriber_dob || row.date_of_birth);

  const payload: Record<string, unknown> = {
    controlNumber: Math.floor(100000000 + Math.random() * 900000000).toString(),
    tradingPartnerServiceId: tradingPartner,
    provider: {
      organizationName: PROVIDER_DEFAULTS.organizationName,
      npi: PROVIDER_DEFAULTS.npi,
    },
    subscriber: {
      memberId,
      firstName: subscriberFirst || undefined,
      lastName: subscriberLast || undefined,
      dateOfBirth: subscriberDob || undefined,
      groupNumber: row.group_number || undefined,
    },
    encounter: {
      serviceTypeCodes: ['30'],
    },
  };

  const stediRes = await fetch(STEDI_URL, {
    method: 'POST',
    headers: {
      // Stedi's eligibility + payer-search endpoints want the raw
      // API key as the Authorization value (NOT "Key <key>", which
      // the legacy claims proxy still uses).
      'Authorization': stediKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseJson = await stediRes.json().catch(() => null);
  const ok = stediRes.ok;

  const nowIso = new Date().toISOString();
  await admin
    .from('vob_requests')
    .update({
      eligibility_response: responseJson ?? { error: 'no-body', status: stediRes.status },
      eligibility_checked_at: nowIso,
      eligibility_checked_by: user.id,
    })
    .eq('id', vobId);

  if (!ok) {
    return NextResponse.json(
      {
        error: 'Stedi eligibility request failed',
        status: stediRes.status,
        response: responseJson,
        request: payload,
      },
      { status: stediRes.status },
    );
  }

  return NextResponse.json({
    id: vobId,
    eligibility_checked_at: nowIso,
    response: responseJson,
    request: payload,
  });
}
