// Resend REST API transport — direct fetch instead of the SDK so we
// don't add a dependency for one POST.
//
// This module is the low-level transport ONLY. It does not read any
// environment variables. Callers must supply the API key and the
// `from` header explicitly. Per-product wrappers under
// src/lib/mailers/* (e.g. vob.ts) own the env contract for their
// own Resend account / project, which is how we keep transactional
// VOB sends isolated from the digital-marketing Resend account.

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export interface EmailAttachment {
  /** Filename the recipient sees. */
  filename: string;
  /** Raw bytes — Resend accepts base64-encoded content. */
  content: ArrayBuffer | Uint8Array;
  /** MIME type. Defaults to application/octet-stream when omitted. */
  contentType?: string;
}

export interface SendEmailArgs {
  /** Resend API key — caller supplies. No process.env fallback. */
  apiKey: string;
  /** From header. Required; caller supplies. */
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  id: string;
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
  if (!args.apiKey) throw new Error('sendEmail: apiKey is required');
  if (!args.from) throw new Error('sendEmail: from is required');

  const payload: Record<string, unknown> = {
    from: args.from,
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
      Authorization: `Bearer ${args.apiKey}`,
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
