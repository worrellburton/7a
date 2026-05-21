import { NextRequest, NextResponse } from 'next/server';
import { escapeHtml, type EmailAttachment } from '@/lib/email-resend';
import { isVobEmailConfigured, sendVobEmail } from '@/lib/mailers/vob';

// POST /api/public/vob
// Public endpoint. Receives insurance-verification requests from the
// AdmissionsForm component (mounted on /admissions and every
// /insurance/* landing page).
//
// HIPAA constraint: card photos must NOT touch our Supabase storage.
// The form posts multipart form-data with the card files inline; this
// route forwards everything straight to Resend as email attachments
// and then drops the bytes. Nothing is written to vob_requests or any
// other table — Resend is the only record of the submission.
//
// Resend tenancy: VOB sends use the transactional Resend account
// (RESEND_VOB_API_KEY), not the digital-marketing one. See
// src/lib/mailers/vob.ts for the env contract.

export const dynamic = 'force-dynamic';
// Form posts can carry two ~10 MB card photos plus the JSON fields.
// Bump the route's body size budget so the larger payload doesn't
// 413 at the platform boundary.
export const maxDuration = 60;

// Mirror the form's accepted MIME types — keep this in sync with
// AdmissionsForm.tsx's ACCEPTED constant so a visitor can't sneak a
// rejected type past the client check via curl.
const ACCEPTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
  'application/pdf',
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB per card

function trim(value: unknown, max = 500): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
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

async function readCardAttachment(form: FormData, field: 'cardFront' | 'cardBack'): Promise<{ attachment: EmailAttachment | null; error: string | null }> {
  const value = form.get(field);
  if (!value || typeof value === 'string') return { attachment: null, error: null };
  const file = value as File;
  if (file.size === 0) return { attachment: null, error: null };
  if (file.size > MAX_BYTES) {
    return { attachment: null, error: `${field} too large (${(file.size / (1024 * 1024)).toFixed(1)} MB > 10 MB)` };
  }
  const contentType = file.type || 'application/octet-stream';
  if (!ACCEPTED_TYPES.has(contentType)) {
    return { attachment: null, error: `${field} mime type not allowed (${contentType})` };
  }
  const buffer = await file.arrayBuffer();
  const ext = contentType.split('/')[1]?.split('+')[0] || 'bin';
  return {
    attachment: {
      filename: `${field === 'cardFront' ? 'insurance-card-front' : 'insurance-card-back'}.${ext === 'jpeg' ? 'jpg' : ext}`,
      content: buffer,
      contentType,
    },
    error: null,
  };
}

function buildEmail(args: {
  name: string;
  phone: string | null;
  email: string | null;
  dateOfBirth: string | null;
  insuranceProvider: string | null;
  hasFront: boolean;
  hasBack: boolean;
}): { subject: string; text: string; html: string } {
  const subject = `New VOB request — ${args.name}${args.insuranceProvider ? ` (${args.insuranceProvider})` : ''}`;

  const lines = [
    ['Name', args.name],
    ['Phone', args.phone],
    ['Email', args.email],
    ['Date of Birth', args.dateOfBirth],
    ['Insurance Provider', args.insuranceProvider],
    ['Card Photos', [args.hasFront ? 'front attached' : null, args.hasBack ? 'back attached' : null].filter(Boolean).join(', ') || 'none uploaded'],
  ] as const;

  const text = lines.map(([k, v]) => `${k}: ${v ?? '—'}`).join('\n');

  const rowsHtml = lines
    .map(([k, v]) => `
      <tr>
        <td style="padding:8px 14px; vertical-align:top; color:#6b6259; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; font-weight:600; white-space:nowrap;">${escapeHtml(k)}</td>
        <td style="padding:8px 14px; vertical-align:top; color:#1a120c; font-size:15px;">${escapeHtml(v ?? '—')}</td>
      </tr>`)
    .join('');

  const html = `<!doctype html>
  <html lang="en">
    <body style="margin:0; padding:24px; background:#f7f2eb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 2px 12px rgba(20,10,6,0.08);">
        <tr>
          <td style="padding:24px 24px 8px; background:#a0522d; color:#ffffff;">
            <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.16em; opacity:0.85; margin-bottom:4px;">Seven Arrows Recovery</div>
            <div style="font-size:20px; font-weight:700;">New VOB Request</div>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%; border-collapse:collapse;">
              ${rowsHtml}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px 24px; color:#7a6f63; font-size:12px; line-height:1.5;">
            Reply directly to this email to reach the visitor at the address they submitted.
            Insurance card photos (when uploaded) are attached to this message and are not stored on our servers.
          </td>
        </tr>
      </table>
    </body>
  </html>`;

  return { subject, text, html };
}

export async function POST(req: NextRequest) {
  if (!isVobEmailConfigured()) {
    console.error('[vob] RESEND_VOB_API_KEY is not configured');
    return NextResponse.json({ error: 'Email is not configured' }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  const full_name = trim(form.get('name'), 200);
  const phone = trim(form.get('phone'), 60);
  const email = trim(form.get('email'), 200);
  const insurance_provider = trim(form.get('insuranceProvider'), 200);
  const date_of_birth = parseDob(form.get('dateOfBirth'));

  if (!full_name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  if (!phone && !email) return NextResponse.json({ error: 'phone or email required' }, { status: 400 });

  const [frontResult, backResult] = await Promise.all([
    readCardAttachment(form, 'cardFront'),
    readCardAttachment(form, 'cardBack'),
  ]);
  if (frontResult.error || backResult.error) {
    return NextResponse.json(
      { error: frontResult.error || backResult.error },
      { status: 400 },
    );
  }

  const attachments: EmailAttachment[] = [];
  if (frontResult.attachment) attachments.push(frontResult.attachment);
  if (backResult.attachment) attachments.push(backResult.attachment);

  const { subject, text, html } = buildEmail({
    name: full_name,
    phone,
    email,
    dateOfBirth: date_of_birth,
    insuranceProvider: insurance_provider,
    hasFront: !!frontResult.attachment,
    hasBack: !!backResult.attachment,
  });

  try {
    await sendVobEmail({
      subject,
      text,
      html,
      // Replying to admissions' inbox routes the reply to the visitor.
      // Falls back to the phone-only flow when no email was supplied.
      replyTo: email ?? undefined,
      attachments,
    });
  } catch (err) {
    console.error('[vob] resend send failed:', err);
    return NextResponse.json({ error: 'Could not send your request. Please call (866) 718-1665.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
