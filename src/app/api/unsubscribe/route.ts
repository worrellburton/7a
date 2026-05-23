import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { verifyUnsubscribeToken } from '@/lib/unsubscribe';

// POST /api/unsubscribe?token=<HMAC token>
//
// Public, unauthenticated endpoint. Anyone with the HMAC-signed
// token (only generated for contacts we actually email) can flip
// their contact row to unsubscribed_at = now(). The campaign send
// pipeline skips contacts where unsubscribed_at is not null, so
// future campaigns won't reach them.
//
// Also handles GET so RFC 8058 one-click unsubscribe headers
// (List-Unsubscribe-Post: List-Unsubscribe=One-Click) can fire
// the endpoint with a POST containing the token in the body, while
// the marketing email's inline link works as a normal GET → public
// page render.

export const dynamic = 'force-dynamic';

async function unsubscribe(token: string | null, source: string) {
  const contactId = verifyUnsubscribeToken(token);
  if (!contactId) {
    return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 400 });
  }
  const admin = getAdminSupabase();
  // Idempotent — re-clicking the link from a forwarded email
  // shouldn't error or bump the timestamp forward.
  const { data: existing } = await admin
    .from('contacts')
    .select('id, email, unsubscribed_at')
    .eq('id', contactId)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: 'Contact not found.' }, { status: 404 });
  }
  if (existing.unsubscribed_at) {
    return NextResponse.json({ ok: true, email: existing.email, alreadyUnsubscribed: true });
  }
  const { error } = await admin
    .from('contacts')
    .update({
      unsubscribed_at: new Date().toISOString(),
      unsubscribed_source: source,
    })
    .eq('id', contactId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, email: existing.email, alreadyUnsubscribed: false });
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  let token = url.searchParams.get('token');
  // RFC 8058 One-Click submits a urlencoded body; Resend forwards
  // the original target URL so the token usually rides in the query
  // string anyway, but parse the body too for completeness.
  if (!token) {
    const ctype = req.headers.get('content-type') ?? '';
    if (ctype.includes('application/x-www-form-urlencoded') || ctype.includes('application/json')) {
      try {
        const text = await req.text();
        const params = ctype.includes('json')
          ? (JSON.parse(text) as Record<string, unknown>)
          : Object.fromEntries(new URLSearchParams(text));
        const t = (params as Record<string, unknown>)?.token;
        if (typeof t === 'string') token = t;
      } catch {
        /* ignore malformed body */
      }
    }
  }
  return unsubscribe(token, 'email-link');
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  return unsubscribe(token, 'email-link');
}
