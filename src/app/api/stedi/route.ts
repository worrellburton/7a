import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase-server';

// POST /api/stedi — authenticated proxy for Stedi professional claims.
// The Stedi API key stays server-side. Browser callers only send the
// claim payload and their Supabase JWT.
//
// Required env:
//   STEDI_API_KEY  — API key from the Stedi dashboard.

const STEDI_URL =
  'https://healthcare.us.stedi.com/2024-04-01/change/medicalnetwork/professionalclaims/v3';

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const stediKey = process.env.STEDI_API_KEY;
  if (!stediKey) {
    return NextResponse.json(
      { error: 'STEDI_API_KEY is not configured on the server.' },
      { status: 500 }
    );
  }

  try {
    const { payload } = (await req.json()) as { payload?: unknown };
    if (!payload) {
      return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
    }

    const res = await fetch(STEDI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${stediKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || 'Stedi API error', details: data },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
