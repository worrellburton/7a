// Resend REST API helper — direct fetch instead of the SDK so we
// don't add a dependency for one POST.
//
// Env contract:
//   RESEND_API_KEY    — server-only API key from resend.com/api-keys.
//   RESEND_FROM       — verified sender. e.g. "Seven Arrows <noreply@…>".
//                       Required once you switch off the resend.dev
//                       sandbox; the route reads this every send so
//                       changing it doesn't require a redeploy.
//   RESEND_TO_VOB     — comma-separated recipient list for the VOB
//                       form. Defaults to admissions@sevenarrowsrecoveryarizona.com
//                       so a missing env doesn't silently drop the
//                       submission on the floor.

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
// Sending domain verified in Resend is sevenarrowsrecovery.com (the
// non-Arizona suffix). The marketing site lives at the Arizona TLD
// but the corporate mail domain is the shorter one — that's the
// only address Resend will let us send from until/unless a second
// domain is added and verified.
const DEFAULT_FROM = 'Seven Arrows Admissions <noreply@sevenarrowsrecovery.com>';
// VOB submissions go to admissions@ (general intake) AND vob@ (the
// dedicated benefits-verification queue) so the team can run both
// inboxes without forwarding rules. Override via RESEND_TO_VOB
// (comma-separated) when the list needs to change.
const DEFAULT_VOB_TO = 'admissions@sevenarrowsrecovery.com, vob@sevenarrowsrecovery.com';

export interface EmailAttachment {
  /** Filename the recipient sees. */
  filename: string;
  /** Raw bytes — Resend accepts base64-encoded content. */
  content: ArrayBuffer | Uint8Array;
  /** MIME type. Defaults to application/octet-stream when omitted. */
  contentType?: string;
}

export interface SendEmailArgs {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  /** Override the From header for this send. */
  from?: string;
}

export interface SendEmailResult {
  id: string;
}

function loadKey(): string {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not configured');
  return key;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function defaultVobRecipients(): string[] {
  const raw = (process.env.RESEND_TO_VOB || DEFAULT_VOB_TO).trim();
  return raw
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  // Chunk the conversion so a 10MB attachment doesn't blow the call
  // stack via String.fromCharCode.apply.
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < view.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(view.subarray(i, i + CHUNK)),
    );
  }
  // btoa is available in the Node 18+ runtime Next.js targets.
  return btoa(binary);
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const key = loadKey();
  const from = args.from || process.env.RESEND_FROM || DEFAULT_FROM;

  const payload: Record<string, unknown> = {
    from,
    to: Array.isArray(args.to) ? args.to : [args.to],
    subject: args.subject,
  };
  if (args.html) payload.html = args.html;
  if (args.text) payload.text = args.text;
  if (args.replyTo) payload.reply_to = args.replyTo;
  if (args.attachments && args.attachments.length > 0) {
    payload.attachments = args.attachments.map((a) => ({
      filename: a.filename,
      content: toBase64(a.content),
      content_type: a.contentType || 'application/octet-stream',
    }));
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`resend send failed (${res.status}): ${detail || res.statusText}`);
  }
  const json = (await res.json().catch(() => ({}))) as { id?: string };
  return { id: json.id ?? '' };
}

// Small escaper for values we drop into the HTML body. Resend
// renders the html field as-is so any visitor-supplied string would
// otherwise pass through unsanitized.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
