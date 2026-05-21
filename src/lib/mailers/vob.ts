// VOB transactional email — its own Resend account, isolated from
// the digital-marketing Resend project.
//
// We run two Resend tenants on purpose:
//
//   - VOB (this module)         transactional, HIPAA-adjacent, no
//                               bulk sends, no marketing list. Reads
//                               RESEND_VOB_* env vars only.
//   - Digital marketing         bulk campaigns out of /app/email-campaigns
//                               (lands on its own branch). Reads
//                               RESEND_API_KEY / RESEND_FROM.
//
// Keeping the keys separate means a compromised marketing key can't
// send anything resembling a benefits-verification email from the
// transactional domain, and vice versa. It also keeps deliverability
// reputations from cross-contaminating: a marketing-list complaint
// can't degrade VOB inbox placement.
//
// Env contract:
//
//   RESEND_VOB_API_KEY   server-only API key for the VOB Resend
//                         project. Required — the route 503s without
//                         it instead of silently dropping the
//                         submission.
//
//   RESEND_VOB_FROM      "From" header. Defaults to
//                         "Seven Arrows Admissions <noreply@sevenarrowsrecovery.com>"
//                         — the domain verified in the VOB Resend
//                         project. NOT the marketing domain.
//
//   RESEND_TO_VOB         Comma-separated recipient list. Defaults to
//                         "admissions@sevenarrowsrecovery.com,
//                          vob@sevenarrowsrecovery.com" so a missing
//                         env doesn't drop submissions on the floor.

import { sendEmail, type EmailAttachment } from '@/lib/email-resend';

const DEFAULT_FROM = 'Seven Arrows Admissions <noreply@sevenarrowsrecovery.com>';
const DEFAULT_TO = 'admissions@sevenarrowsrecovery.com, vob@sevenarrowsrecovery.com';

export function isVobEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_VOB_API_KEY);
}

export function vobFrom(): string {
  return process.env.RESEND_VOB_FROM || DEFAULT_FROM;
}

export function vobRecipients(): string[] {
  const raw = (process.env.RESEND_TO_VOB || DEFAULT_TO).trim();
  return raw
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

export interface SendVobEmailArgs {
  /** Override the configured recipient list (defaults to vobRecipients()). */
  to?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export async function sendVobEmail(args: SendVobEmailArgs): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_VOB_API_KEY;
  if (!apiKey) throw new Error('RESEND_VOB_API_KEY is not configured');
  return sendEmail({
    apiKey,
    from: vobFrom(),
    to: args.to ?? vobRecipients(),
    subject: args.subject,
    html: args.html,
    text: args.text,
    replyTo: args.replyTo,
    attachments: args.attachments,
  });
}
