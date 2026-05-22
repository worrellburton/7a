import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';

// POST /api/public/vob
//
// Public endpoint. Receives insurance-verification requests from the
// AdmissionsForm component (mounted on /admissions and every
// /insurance/* landing page). No auth — lives behind the same CSRF
// posture as the rest of the public site.
//
// Flow:
//   1. Form uploads card images to the private vob-cards bucket via
//      anon (RLS allows insert only). The resulting storage paths
//      arrive here as cardFrontPath / cardBackPath.
//   2. This route downloads the cards from storage server-side,
//      builds a single HTML email containing the full VOB record
//      (name, phone, email, DOB, insurance provider) plus the card
//      images as attachments, and sends it to the admissions email
//      group via Resend.
//   3. After the email lands, we best-effort delete the storage
//      objects so PHI doesn't sit orphaned in the bucket.
//
// We deliberately do NOT insert a vob_requests row. The admin queue
// in /app/website-requests was retired in favour of routing VOBs
// straight to the admissions inbox — fewer surfaces holding PHI,
// fewer audit obligations, simpler workflow.

export const dynamic = 'force-dynamic';
// Card downloads + base64 encoding + Resend round-trip can take
// several seconds; raise the default 10s edge timeout so a slow
// storage read doesn't trip the route.
export const maxDuration = 60;

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function prettyDob(iso: string | null): string {
  if (!iso) return 'Not provided';
  const [yy, mm, dd] = iso.split('-').map(Number);
  if (!yy || !mm || !dd) return iso;
  const age = (() => {
    const now = new Date();
    let a = now.getUTCFullYear() - yy;
    const m = now.getUTCMonth() - (mm - 1);
    if (m < 0 || (m === 0 && now.getUTCDate() < dd)) a -= 1;
    return a;
  })();
  return `${mm}/${dd}/${yy} (${age}yr)`;
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
  const card_front_path = trim(body.cardFrontPath, 300);
  const card_back_path = trim(body.cardBackPath, 300);
  // Card paths are only trusted if they sit inside the random-token
  // folder structure the form generates (e.g. `mpfsjw2e-ednyri2t/front.jpg`).
  const looksLikeCardPath = (p: string | null) => p === null || /^[A-Za-z0-9_-]+\/(front|back)\.[A-Za-z0-9]+$/.test(p);
  const safeFront = looksLikeCardPath(card_front_path) ? card_front_path : null;
  const safeBack = looksLikeCardPath(card_back_path) ? card_back_path : null;

  if (!full_name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (!phone && !email) {
    return NextResponse.json({ error: 'phone or email required' }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Without Resend configured we'd be silently dropping a real
    // patient's VOB request. Fail loud so the deployment surfaces
    // the gap instead of pretending success.
    console.error('[vob] RESEND_API_KEY missing — cannot deliver VOB; failing the request');
    return NextResponse.json({ error: 'VOB delivery is not configured' }, { status: 500 });
  }

  const admin = getAdminSupabase();

  // Download both card images in parallel. Failures here are
  // tolerated: the email still goes out, just without that
  // attachment, and the body calls out which card is missing.
  const [frontAttachment, backAttachment] = await Promise.all([
    safeFront ? downloadCardAttachment(admin, safeFront, 'front') : Promise.resolve(null),
    safeBack ? downloadCardAttachment(admin, safeBack, 'back') : Promise.resolve(null),
  ]);

  const attachments: Array<{ filename: string; content: string; content_type?: string }> = [];
  if (frontAttachment) attachments.push(frontAttachment);
  if (backAttachment) attachments.push(backAttachment);

  const toEnv = process.env.VOB_NOTIFY_TO || process.env.ADMISSIONS_NOTIFY_TO;
  const recipients = (toEnv || 'admissions@sevenarrowsrecovery.com')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (recipients.length === 0) {
    console.error('[vob] No recipients configured (VOB_NOTIFY_TO) — failing');
    return NextResponse.json({ error: 'VOB delivery has no recipients configured' }, { status: 500 });
  }

  const from = (process.env.RESEND_FROM || process.env.EMAIL_FROM
    || 'Seven Arrows Recovery <hello@sevenarrowsrecovery.com>').trim();
  const replyTo = (process.env.RESEND_REPLY_TO || process.env.EMAIL_REPLY_TO || '').trim() || null;

  const subject = `New VOB request · ${full_name}`;
  const html = renderVobEmail({
    full_name,
    phone,
    email,
    date_of_birth,
    insurance_provider,
    hasFront: !!frontAttachment,
    hasBack: !!backAttachment,
    requestedFront: !!safeFront,
    requestedBack: !!safeBack,
    receivedAt: new Date(),
  });

  const sendBody: Record<string, unknown> = {
    from,
    to: recipients,
    subject,
    html,
  };
  if (replyTo) sendBody.reply_to = replyTo;
  if (attachments.length > 0) sendBody.attachments = attachments;

  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(sendBody),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.error(`[vob] Resend ${res.status}: ${txt.slice(0, 500)}`);
    return NextResponse.json({ error: 'Could not deliver VOB' }, { status: 502 });
  }

  // Best-effort cleanup so PHI cards don't linger in the private
  // bucket once the email has shipped. Failure here is non-fatal —
  // the email already left, and an orphan card in a private bucket
  // is recoverable later if needed.
  const toRemove: string[] = [];
  if (safeFront) toRemove.push(safeFront);
  if (safeBack) toRemove.push(safeBack);
  if (toRemove.length > 0) {
    admin.storage.from('vob-cards').remove(toRemove).then((r) => {
      if (r.error) console.warn('[vob] storage cleanup failed:', r.error.message);
    }).catch((e) => {
      console.warn('[vob] storage cleanup threw:', e);
    });
  }

  return NextResponse.json({ ok: true });
}

interface CardAttachment { filename: string; content: string; content_type?: string }

async function downloadCardAttachment(
  admin: ReturnType<typeof getAdminSupabase>,
  path: string,
  which: 'front' | 'back',
): Promise<CardAttachment | null> {
  try {
    const { data, error } = await admin.storage.from('vob-cards').download(path);
    if (error || !data) {
      console.warn(`[vob] download ${which} card failed:`, error?.message ?? 'no data');
      return null;
    }
    const buf = Buffer.from(await data.arrayBuffer());
    // Trust the storage path's extension for the content-type
    // hint; fall back to octet-stream if the form ever uploads
    // something unusual.
    const ext = (path.match(/\.([A-Za-z0-9]+)$/)?.[1] ?? '').toLowerCase();
    const mime =
      ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
      : ext === 'png' ? 'image/png'
      : ext === 'heic' ? 'image/heic'
      : ext === 'webp' ? 'image/webp'
      : 'application/octet-stream';
    return {
      filename: `insurance-card-${which}.${ext || 'jpg'}`,
      content: buf.toString('base64'),
      content_type: mime,
    };
  } catch (e) {
    console.warn(`[vob] download ${which} card threw:`, e);
    return null;
  }
}

interface EmailParams {
  full_name: string;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  insurance_provider: string | null;
  hasFront: boolean;
  hasBack: boolean;
  requestedFront: boolean;
  requestedBack: boolean;
  receivedAt: Date;
}

function renderVobEmail(p: EmailParams): string {
  const cardLine = (label: string, hasIt: boolean, wasRequested: boolean) => {
    if (!wasRequested) return `<li><strong>${label}:</strong> not provided</li>`;
    if (hasIt) return `<li><strong>${label}:</strong> attached to this email</li>`;
    return `<li><strong>${label}:</strong> <span style="color:#a30c0c;">upload failed — ask the patient to resend</span></li>`;
  };
  const tel = p.phone ? `<a href="tel:${escapeHtml(p.phone)}" style="color:#a36b3a; text-decoration:none;">${escapeHtml(p.phone)}</a>` : 'Not provided';
  const mail = p.email ? `<a href="mailto:${escapeHtml(p.email)}" style="color:#a36b3a; text-decoration:none;">${escapeHtml(p.email)}</a>` : 'Not provided';
  return `<!doctype html><html><body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #2a1c14; line-height: 1.55; max-width: 560px; margin: 0 auto; padding: 24px; background: #fff;">
  <p style="font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #a36b3a; margin: 0 0 6px;">New VOB request</p>
  <h1 style="font-size: 22px; margin: 0 0 4px; color: #1c100b;">${escapeHtml(p.full_name)}</h1>
  <p style="font-size: 12px; color: #8b7766; margin: 0 0 20px;">Received ${p.receivedAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>

  <table style="width: 100%; border-collapse: collapse; margin: 0 0 18px;">
    <tbody>
      <tr><td style="padding: 6px 12px 6px 0; color: #6b574a; font-size: 12px; vertical-align: top; width: 130px;">Phone</td><td style="padding: 6px 0; color: #1c100b;">${tel}</td></tr>
      <tr><td style="padding: 6px 12px 6px 0; color: #6b574a; font-size: 12px; vertical-align: top;">Email</td><td style="padding: 6px 0; color: #1c100b;">${mail}</td></tr>
      <tr><td style="padding: 6px 12px 6px 0; color: #6b574a; font-size: 12px; vertical-align: top;">Date of birth</td><td style="padding: 6px 0; color: #1c100b;">${escapeHtml(prettyDob(p.date_of_birth))}</td></tr>
      <tr><td style="padding: 6px 12px 6px 0; color: #6b574a; font-size: 12px; vertical-align: top;">Insurance provider</td><td style="padding: 6px 0; color: #1c100b;">${p.insurance_provider ? escapeHtml(p.insurance_provider) : 'Not provided'}</td></tr>
    </tbody>
  </table>

  <p style="font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #a36b3a; margin: 18px 0 6px;">Insurance cards</p>
  <ul style="padding-left: 18px; margin: 0 0 18px; color: #4a3a2f;">
    ${cardLine('Front', p.hasFront, p.requestedFront)}
    ${cardLine('Back', p.hasBack, p.requestedBack)}
  </ul>

  <p style="margin: 24px 0 0; font-size: 11px; color: #8b7766; border-top: 1px solid #eadfd4; padding-top: 14px;">
    Contains PHI. Handle this email per HIPAA: don't forward outside admissions, don't paste into shared chat. Reply to the patient using their stored phone or email above.
  </p>
</body></html>`;
}
