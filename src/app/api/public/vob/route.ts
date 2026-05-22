import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';

// POST /api/public/vob
// Public endpoint. Receives insurance-verification requests from the
// AdmissionsForm component (mounted on /admissions and every
// /insurance/* landing page). No auth — lives behind the same CSRF
// posture as the rest of the public site.
//
// Card photos are uploaded by the form directly to the private
// `vob-cards` storage bucket via the anon key (RLS allows insert
// only). The resulting storage paths arrive here as
// cardFrontPath / cardBackPath and we persist them on the row.
//
// After insert we ping admissions over Resend so they know a new
// VOB is waiting — the email is intentionally PHI-light (no DOB,
// no insurance details, no card images): just "a VOB came in,
// open the admin to view it". HIPAA email is hard; the safer
// posture is to surface the existence of the record and force the
// review to happen inside the gated admin panel.

export const dynamic = 'force-dynamic';

const RESEND_URL = 'https://api.resend.com/emails';

interface Body {
  name?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string | null;
  date_of_birth?: string | null;
  insuranceProvider?: string;
  insurance_provider?: string;
  cardFrontPath?: string | null;
  cardBackPath?: string | null;
}

// Accept YYYY-MM-DD only (the format the <input type="date"> emits in
// every browser). Reject anything else so we never insert garbage
// into a `date` column. Also reject future dates and anything before
// 1900 — those are clearly typos rather than real birthdates.
function parseDob(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const year = Number(s.slice(0, 4));
  if (year < 1900) return null;
  if (d.getTime() > Date.now()) return null;
  return s;
}

function trim(value: unknown, max = 500): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const full_name = trim(body.name, 200);
  const phone = trim(body.phone, 60);
  const email = trim(body.email, 200);
  const insurance_provider = trim(body.insuranceProvider ?? body.insurance_provider, 200);
  const date_of_birth = parseDob(body.dateOfBirth ?? body.date_of_birth);
  // Storage paths are short and safe to trust at face value — they
  // come from a successful upload to a bucket that only allows the
  // anon role to INSERT, never to read or list. Still constrain to a
  // reasonable length and require they sit inside the random-token
  // folder structure the form generates.
  const card_front_path = trim(body.cardFrontPath, 300);
  const card_back_path = trim(body.cardBackPath, 300);
  const looksLikeCardPath = (p: string | null) => p === null || /^[A-Za-z0-9_-]+\/(front|back)\.[A-Za-z0-9]+$/.test(p);
  const safeFront = looksLikeCardPath(card_front_path) ? card_front_path : null;
  const safeBack = looksLikeCardPath(card_back_path) ? card_back_path : null;

  if (!full_name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (!phone && !email) {
    return NextResponse.json({ error: 'phone or email required' }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('vob_requests')
    .insert({
      full_name,
      phone,
      email,
      date_of_birth,
      insurance_provider,
      card_front_path: safeFront,
      card_back_path: safeBack,
    })
    .select('id')
    .maybeSingle();

  if (error) {
    console.error(`[vob] insert failed: ${error.message}`);
    return NextResponse.json({ error: 'Could not save your request' }, { status: 500 });
  }

  // Fire-and-forget notification to admissions. Failures (no API
  // key in env, transient 5xx from Resend, etc.) are logged but
  // never fail the visitor's submission — the row is already in
  // the DB and is what actually matters.
  void notifyAdmissions({
    id: data?.id ?? null,
    full_name,
    contactSignal: phone ? 'phone' : 'email',
    insuranceProviderHint: !!insurance_provider,
    hasCards: !!(safeFront || safeBack),
    sourceOrigin: req.nextUrl?.origin ?? null,
  }).catch((e) => {
    console.error('[vob] notification email failed:', e);
  });

  return NextResponse.json({ ok: true, id: data?.id ?? null });
}

interface NotifyParams {
  id: string | null;
  full_name: string;
  contactSignal: 'phone' | 'email';
  insuranceProviderHint: boolean;
  hasCards: boolean;
  sourceOrigin: string | null;
}

async function notifyAdmissions(params: NotifyParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info('[vob] RESEND_API_KEY not set — skipping admissions notification');
    return;
  }
  const toEnv = process.env.VOB_NOTIFY_TO || process.env.ADMISSIONS_NOTIFY_TO;
  const recipients = (toEnv || 'admissions@sevenarrowsrecovery.com')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (recipients.length === 0) return;

  const from = (process.env.RESEND_FROM || process.env.EMAIL_FROM
    || 'Seven Arrows Recovery <hello@sevenarrowsrecovery.com>').trim();
  // First-name-only in the body so the email itself doesn't carry
  // identifying patient info — HIPAA cleaner than emailing the full
  // record. Last name + everything else stays inside the gated
  // admin panel.
  const firstName = params.full_name.split(/\s+/)[0] || 'A new request';
  const subject = `New VOB request · ${firstName}`;
  const adminLink = params.sourceOrigin
    ? `${params.sourceOrigin}/app/website-requests?tab=vobs`
    : '/app/website-requests?tab=vobs';

  const html = `<!doctype html><html><body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #2a1c14; line-height: 1.5; max-width: 520px; margin: 0 auto; padding: 24px;">
  <p style="font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #a36b3a; margin: 0 0 6px;">New VOB request</p>
  <h1 style="font-size: 20px; margin: 0 0 14px; color: #1c100b;">${escapeHtml(firstName)} submitted the VOB form</h1>
  <p style="margin: 0 0 8px;">A new insurance-verification request just landed in the admin queue.</p>
  <ul style="padding-left: 18px; margin: 0 0 14px; color: #4a3a2f;">
    <li>Reach-back: ${params.contactSignal === 'phone' ? 'phone on file' : 'email on file'}</li>
    <li>Insurance provider: ${params.insuranceProviderHint ? 'provided' : 'not provided'}</li>
    <li>Insurance cards: ${params.hasCards ? 'uploaded' : 'not uploaded'}</li>
  </ul>
  <p style="margin: 0 0 16px; color: #4a3a2f;">PHI lives behind the admin panel's HIPAA acknowledgment — open the queue to review.</p>
  <p style="margin: 0;">
    <a href="${escapeHtml(adminLink)}" style="display: inline-block; padding: 10px 18px; background: #a36b3a; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Open admin queue</a>
  </p>
  <p style="margin: 24px 0 0; font-size: 11px; color: #8b7766;">
    This email does not contain PHI. Names beyond first name, DOB, insurance details, and card images stay inside the admin panel.
  </p>
</body></html>`;

  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: recipients, subject, html }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.error(`[vob] Resend ${res.status}: ${txt.slice(0, 500)}`);
  } else {
    console.info(`[vob] admissions notified for request ${params.id ?? '(unknown id)'}`);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
