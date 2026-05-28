import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { verifyUnsubscribeToken } from '@/lib/unsubscribe';
import { markUnsubscribedOnAudience } from '@/lib/resend-broadcasts';

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

  // Mirror the unsubscribe out to every Resend audience this email
  // has ever been part of. Audiences live under each campaign's
  // resend_audience_id; PATCH-ing the contact within them prevents
  // Resend from re-shipping if a future broadcast accidentally
  // points at an older audience. Best-effort: failures here don't
  // block the response — our DB is the source of truth and the
  // send pipeline already filters unsubscribed contacts upfront.
  if (existing.email) {
    try {
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        const { data: campaignRows } = await admin
          .from('email_campaign_recipients')
          .select('campaign_id, email_campaigns!inner(resend_audience_id)')
          .eq('contact_id', contactId);
        const seen = new Set<string>();
        for (const r of (campaignRows ?? []) as Array<{ email_campaigns: Array<{ resend_audience_id: string | null }> | { resend_audience_id: string | null } | null }>) {
          const rel = r.email_campaigns;
          const audId = Array.isArray(rel) ? rel[0]?.resend_audience_id : rel?.resend_audience_id;
          if (!audId || seen.has(audId)) continue;
          seen.add(audId);
          await markUnsubscribedOnAudience(apiKey, audId, existing.email).catch(() => undefined);
        }
      }
    } catch (e) {
      console.error('[unsubscribe] resend mirror failed', e);
    }
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
