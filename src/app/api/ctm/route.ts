import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase-server';

// POST /api/ctm — authenticated proxy to the CallTrackingMetrics API.
// The CTM basic-auth token stays on the server. Browser code sends its
// Supabase JWT, we verify it, then forward to CTM with the real token.
//
// Required env:
//   CTM_API_TOKEN  — base64 "account_id:api_key" string from CTM.

const CTM_BASE = 'https://api.calltrackingmetrics.com/api/v1';

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctmToken = process.env.CTM_API_TOKEN;
  if (!ctmToken) {
    return NextResponse.json(
      { error: 'CTM_API_TOKEN is not configured on the server.' },
      { status: 500 }
    );
  }

  const body = await req.json();
  const { endpoint, params } = body as { endpoint?: string; params?: Record<string, string | number> };

  if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
  if (!endpoint.startsWith('/')) {
    return NextResponse.json({ error: 'Endpoint must start with /' }, { status: 400 });
  }

  try {
    const url = new URL(`${CTM_BASE}${endpoint}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value));
      }
    }

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${ctmToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `CTM API error (${res.status}): ${text}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
