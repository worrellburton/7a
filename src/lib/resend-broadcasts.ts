// Resend Marketing/Broadcasts wrapper. Replaces the per-recipient
// transactional /emails calls in email-campaigns-send.ts with a
// single audience+broadcast pair per campaign. Two wins:
//
//   1. The transactional daily quota (100/day on Free, ~1k on Pro)
//      no longer caps marketing sends. Broadcasts has its own pool,
//      which is much larger.
//
//   2. We make 2 API calls per campaign instead of N. A 261-row
//      campaign that used to take ~10 minutes to drain across cron
//      ticks now goes out in seconds.
//
// What about per-recipient personalization? Each broadcast carries a
// single HTML body. Resend substitutes its own merge tags (most
// importantly {{{RESEND_UNSUBSCRIBE_URL}}}) per-recipient at send
// time. We use that for unsubs going forward; the audience tracks
// who's unsubscribed and Resend skips them on the next broadcast.
//
// Webhook events (delivered/opened/clicked/bounced/unsubscribed) fire
// the same way they did for transactional sends — the payload carries
// broadcast_id + the recipient's email so we can link each event back
// to the right campaign + recipient row.

const RESEND_API = 'https://api.resend.com';

export interface ResendBroadcastContact {
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface BroadcastEnvelope {
  subject: string;
  html: string;
  from: string;
  replyTo?: string;
  /** Human-readable name shown in the Resend dashboard. */
  name?: string;
}

export interface BroadcastResult {
  audienceId: string;
  broadcastId: string;
  scheduledRecipients: number;
  simulated: boolean;
}

interface ResendErrorBody {
  name?: string;
  message?: string;
  statusCode?: number;
}

async function resendFetch(
  path: string,
  init: RequestInit & { apiKey: string },
): Promise<{ ok: true; data: unknown } | { ok: false; status: number; error: string }> {
  const { apiKey, headers, ...rest } = init;
  const res = await fetch(`${RESEND_API}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text.slice(0, 1000);
    try {
      const body = JSON.parse(text) as ResendErrorBody;
      msg = `${body.name ?? `HTTP ${res.status}`}: ${body.message ?? text.slice(0, 500)}`;
    } catch { /* non-JSON body — fall through */ }
    return { ok: false, status: res.status, error: msg };
  }
  try { return { ok: true, data: JSON.parse(text) }; }
  catch { return { ok: true, data: text }; }
}

// Create a fresh audience for one campaign send. We don't reuse a
// singleton audience because we want a clean unsubscribe filter per
// campaign — we exclude unsubscribed contacts at upsert time and
// Resend's audience-level unsub tracking layers on top.
export async function createAudience(
  apiKey: string,
  name: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const r = await resendFetch('/audiences', {
    apiKey,
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  if (!r.ok) return { ok: false, error: r.error };
  const id = (r.data as { id?: string }).id;
  if (!id) return { ok: false, error: 'Resend did not return an audience id.' };
  return { ok: true, id };
}

// Bulk-add contacts to an audience. Resend's API is one-at-a-time
// (POST /audiences/{id}/contacts) so we run a small parallel pool.
// Duplicates within the same audience return 422 — we treat that as
// success since the contact is already in the list.
export async function addContactsToAudience(
  apiKey: string,
  audienceId: string,
  contacts: ResendBroadcastContact[],
  opts: { parallelism?: number } = {},
): Promise<{ added: number; alreadyIn: number; failed: number; firstError?: string }> {
  const parallelism = Math.max(1, Math.min(opts.parallelism ?? 8, 16));
  let added = 0; let alreadyIn = 0; let failed = 0; let firstError: string | undefined;
  let cursor = 0;
  const worker = async () => {
    while (cursor < contacts.length) {
      const idx = cursor; cursor += 1;
      const c = contacts[idx];
      if (!c?.email) continue;
      const r = await resendFetch(`/audiences/${audienceId}/contacts`, {
        apiKey,
        method: 'POST',
        body: JSON.stringify({
          email: c.email,
          first_name: c.firstName ?? undefined,
          last_name: c.lastName ?? undefined,
          unsubscribed: false,
        }),
      });
      if (r.ok) { added += 1; continue; }
      // 409/422 → already in the audience.
      if (r.status === 409 || r.status === 422) { alreadyIn += 1; continue; }
      failed += 1;
      if (!firstError) firstError = r.error;
    }
  };
  const workers: Array<Promise<void>> = [];
  for (let i = 0; i < Math.min(parallelism, contacts.length); i += 1) workers.push(worker());
  await Promise.all(workers);
  return { added, alreadyIn, failed, firstError };
}

// Create a broadcast tied to an audience. The send is a separate call.
export async function createBroadcast(
  apiKey: string,
  audienceId: string,
  envelope: BroadcastEnvelope,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const r = await resendFetch('/broadcasts', {
    apiKey,
    method: 'POST',
    body: JSON.stringify({
      audience_id: audienceId,
      from: envelope.from,
      subject: envelope.subject,
      html: envelope.html,
      reply_to: envelope.replyTo,
      name: envelope.name,
    }),
  });
  if (!r.ok) return { ok: false, error: r.error };
  const id = (r.data as { id?: string }).id;
  if (!id) return { ok: false, error: 'Resend did not return a broadcast id.' };
  return { ok: true, id };
}

// Trigger the actual fan-out. Resend queues and paces internally.
export async function sendBroadcast(
  apiKey: string,
  broadcastId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await resendFetch(`/broadcasts/${broadcastId}/send`, {
    apiKey,
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true };
}

// Best-effort sync: mark a contact unsubscribed on every audience
// we've shipped to. Called from POST /api/unsubscribe so a recipient
// who clicks our internal unsub link is also flagged on Resend's
// side, in case they're in any audience we'd otherwise re-broadcast
// to. PATCH /audiences/{aid}/contacts/{email} accepts an
// unsubscribed=true flag.
export async function markUnsubscribedOnAudience(
  apiKey: string,
  audienceId: string,
  email: string,
): Promise<{ ok: boolean; error?: string }> {
  const r = await resendFetch(
    `/audiences/${audienceId}/contacts/${encodeURIComponent(email)}`,
    { apiKey, method: 'PATCH', body: JSON.stringify({ unsubscribed: true }) },
  );
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true };
}

// Stitches the campaign HTML so per-recipient bits Resend supports
// natively land in the body. Right now that's the
// {{{RESEND_UNSUBSCRIBE_URL}}} merge tag in the footer — Resend
// replaces it at send time with a recipient-specific opt-out URL
// hosted on resend.com. Same URL is also used as the value for the
// List-Unsubscribe header. We leave the rest of the HTML alone.
export function prepareBroadcastHtml(html: string): string {
  const unsub = '{{{RESEND_UNSUBSCRIBE_URL}}}';
  const footer = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf6f1;">
  <tr>
    <td align="center" style="padding:24px 16px 32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:#8a7a6c;letter-spacing:0.04em;line-height:1.6;">
      You're receiving this because you've worked with Seven Arrows Recovery.<br />
      <a href="${unsub}" style="color:#b87333;text-decoration:underline;font-weight:600;">Unsubscribe from these emails</a>
    </td>
  </tr>
</table>`;
  return html.includes('</body>')
    ? html.replace('</body>', `${footer}\n</body>`)
    : `${html}\n${footer}`;
}
