import { NextRequest, NextResponse } from 'next/server';

// Proxy claims to Stedi API to keep API key server-side
export async function POST(req: NextRequest) {
  try {
    const { apiKey, payload } = await req.json();

    if (!apiKey || !payload) {
      return NextResponse.json({ error: 'Missing apiKey or payload' }, { status: 400 });
    }

    const res = await fetch(
      'https://healthcare.us.stedi.com/2024-04-01/change/medicalnetwork/professionalclaims/v3',
      {
        method: 'POST',
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.message || 'Stedi API error', details: data }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
