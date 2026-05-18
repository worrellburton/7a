import { NextRequest, NextResponse } from 'next/server';
import { defaultVobRecipients, isEmailConfigured, sendEmail } from '@/lib/email-resend';

// GET /api/public/vob/debug
// One-shot diagnostic for the VOB email pipeline. Returns:
//   - whether RESEND_API_KEY is configured
//   - the resolved "from" header the route would use
//   - the resolved recipient list
//   - the result of a real (tiny) Resend send so any 4xx/5xx body
//     from the Resend API is surfaced verbatim
//
// Public on purpose so a browser hit is enough to debug; the response
// never reveals the API key. Pass ?to=you@example.com to override
// the recipient for the test send (defaults to the configured
// RESEND_TO_VOB list).
//
// Remove this route once the form is working in production.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const toOverride = url.searchParams.get('to');
  const from = process.env.RESEND_FROM || 'Seven Arrows Admissions <noreply@sevenarrowsrecovery.com>';
  const to = toOverride ? [toOverride] : defaultVobRecipients();

  const out: Record<string, unknown> = {
    hasResendKey: isEmailConfigured(),
    from,
    to,
  };

  if (!isEmailConfigured()) {
    out.sendAttempt = { ok: false, error: 'RESEND_API_KEY is not set on the deployment' };
    return NextResponse.json(out, { status: 200 });
  }

  try {
    const result = await sendEmail({
      to,
      subject: 'VOB pipeline debug — Seven Arrows',
      text: 'This is the /api/public/vob/debug endpoint confirming the Resend wiring works end-to-end. You can ignore this message.',
      html: '<p>This is the <code>/api/public/vob/debug</code> endpoint confirming the Resend wiring works end-to-end. You can ignore this message.</p>',
    });
    out.sendAttempt = { ok: true, id: result.id };
  } catch (e) {
    // Surface the full error verbatim — this is the whole point of
    // the endpoint. The Vercel runtime-log MCP truncates messages so
    // we can't read them otherwise.
    out.sendAttempt = {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  return NextResponse.json(out, { status: 200 });
}
