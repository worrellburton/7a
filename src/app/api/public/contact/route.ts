import { NextRequest, NextResponse } from 'next/server';
import { getPublicSupabase } from '@/lib/supabase-server';

export const runtime = 'nodejs';

/**
 * Public contact form endpoint. Accepts a JSON POST from the
 * ContactForm component and inserts a row into
 * `public.contact_submissions`. Responds with `{ ok: true }` on
 * success so the client can clear the form; on any server-side
 * failure we still return `{ ok: true }` to the visitor (the form
 * shouldn't "break" from their perspective) but log the error so
 * it shows up in Vercel / Supabase logs for follow-up.
 *
 * The row is intentionally minimal — we capture the fields the
 * form actually collects plus a couple of headers (user-agent,
 * referrer) that help triage submissions later.
 */
export async function POST(req: NextRequest) {
  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const firstName = str(payload.firstName, 80);
  const lastName = str(payload.lastName, 80);
  const email = str(payload.email, 160);
  const telephone = str(payload.telephone, 40);
  const paymentMethod = str(payload.paymentMethod, 40);
  const message = str(payload.message, 2000);

  if (!firstName || !email) {
    return NextResponse.json(
      { ok: false, error: 'first_name_and_email_required' },
      { status: 400 },
    );
  }

  try {
    const supabase = getPublicSupabase();
    const { error } = await supabase.from('contact_submissions').insert({
      first_name: firstName,
      last_name: lastName || null,
      email,
      telephone: telephone || null,
      payment_method: paymentMethod || null,
      message: message || null,
      user_agent: req.headers.get('user-agent'),
      referrer: req.headers.get('referer'),
    });
    if (error) {
      // Degrade gracefully — log but don't break the visitor's
      // experience. The code path we most care about here is "the
      // migration hasn't been applied yet", where the insert will
      // fail with a schema error. The user still sees a success
      // toast and we surface the error in logs for repair.
      console.error('[contact] insert failed, falling back to log:', error.message);
      console.info('[contact] submission payload:', {
        firstName,
        lastName,
        email,
        telephone,
        paymentMethod,
        message: message?.slice(0, 200),
      });
    }
  } catch (err) {
    console.error('[contact] supabase threw, falling back to log:', err);
    console.info('[contact] submission payload:', {
      firstName,
      lastName,
      email,
      telephone,
      paymentMethod,
    });
  }

  return NextResponse.json({ ok: true });
}

function str(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}
