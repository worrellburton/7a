// Aircall REST client + Call→row mapping, shared by the webhook,
// backfill, and availability routes.
//
// SERVER-ONLY. This module reads the Aircall API secret from the
// environment and builds a Basic-auth header — never import it into
// client components.
//
// Auth: Aircall uses HTTP Basic auth where the API ID is the username
// and the API Token is the password. Set both in the environment:
//   AIRCALL_API_ID      — the "API ID" shown on the Aircall API Keys page
//   AIRCALL_API_TOKEN    — the token revealed once when you generate a key
//   AIRCALL_WEBHOOK_TOKEN — shared secret echoed back in webhook payloads

const AIRCALL_BASE = 'https://api.aircall.io/v1';

export function aircallAuthHeader(): string | null {
  const id = process.env.AIRCALL_API_ID;
  const token = process.env.AIRCALL_API_TOKEN;
  if (!id || !token) return null;
  return 'Basic ' + Buffer.from(`${id}:${token}`).toString('base64');
}

export function aircallConfigured(): boolean {
  return !!aircallAuthHeader();
}

interface AircallFetchOpts {
  params?: Record<string, string | number | undefined>;
  method?: string;
  body?: unknown;
}

export async function aircallFetch<T = unknown>(path: string, opts: AircallFetchOpts = {}): Promise<T> {
  const auth = aircallAuthHeader();
  if (!auth) {
    throw new Error('Aircall is not configured — set AIRCALL_API_ID and AIRCALL_API_TOKEN.');
  }
  const url = new URL(`${AIRCALL_BASE}${path}`);
  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    method: opts.method ?? 'GET',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Aircall ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

// ------------------------------------------------------------
// Aircall Call object (the subset we persist).
// ------------------------------------------------------------

export interface AircallNumber { id?: number; name?: string; digits?: string; country?: string; }
export interface AircallUser { id?: number; name?: string; email?: string; availability_status?: string; }
export interface AircallContact { id?: number; first_name?: string; last_name?: string; company_name?: string; }
export interface AircallTag { id?: number; name?: string; color?: string; }
export interface AircallComment { id?: number; content?: string; posted_by?: AircallUser; posted_at?: number; }

export interface AircallCall {
  id: number;
  sid?: string;
  call_uuid?: string;
  direction?: string;
  status?: string;
  started_at?: number;
  answered_at?: number | null;
  ended_at?: number;
  duration?: number;
  raw_digits?: string;
  missed_call_reason?: string | null;
  archived?: boolean;
  recording?: string | null;
  voicemail?: string | null;
  asset?: string | null;
  number?: AircallNumber;
  user?: AircallUser | null;
  assigned_to?: AircallUser | null;
  contact?: AircallContact | null;
  teams?: { name?: string }[];
  tags?: AircallTag[];
  comments?: AircallComment[];
}

function unixToIso(n: number | null | undefined): string | null {
  if (n === null || n === undefined) return null;
  const ms = n > 1e12 ? n : n * 1000; // accept seconds or millis
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function digitsOnly(s: string | null | undefined): string | null {
  if (!s) return null;
  const d = s.replace(/\D/g, '');
  return d.length ? d : null;
}

// Missed = an inbound call that ended without ever being answered, or
// one Aircall flagged with an explicit missed reason. This drives the
// recovery view (the most valuable signal carried over from CTM).
export function isMissed(c: AircallCall): boolean {
  if (c.direction !== 'inbound') return false;
  if (c.missed_call_reason) return true;
  if ((c.status === 'done' || c.status === undefined) && !c.answered_at && !c.duration) return true;
  return false;
}

// Map an Aircall Call object to an aircall_calls row. Intentionally
// omits the AI columns (transcript / summary / topics / sentiment /
// ai) so a later call.* upsert never clobbers Conversation-Intelligence
// data that arrived separately via the AI webhooks.
export function mapAircallCall(c: AircallCall): Record<string, unknown> {
  const contactName = c.contact
    ? [c.contact.first_name, c.contact.last_name].filter(Boolean).join(' ').trim() || null
    : null;
  return {
    aircall_id: c.id,
    call_uuid: c.call_uuid ?? null,
    sid: c.sid ?? null,
    direction: c.direction ?? null,
    status: c.status ?? null,
    missed: isMissed(c),
    missed_call_reason: c.missed_call_reason ?? null,
    voicemail: !!c.voicemail,
    archived: c.archived ?? false,
    started_at: unixToIso(c.started_at),
    answered_at: unixToIso(c.answered_at ?? null),
    ended_at: unixToIso(c.ended_at),
    duration: c.duration ?? null,
    raw_digits: c.raw_digits ?? null,
    caller_number: digitsOnly(c.raw_digits),
    number_id: c.number?.id ?? null,
    number_name: c.number?.name ?? null,
    number_digits: c.number?.digits ?? null,
    user_id: c.user?.id ?? null,
    user_name: c.user?.name ?? null,
    user_email: c.user?.email ?? null,
    assigned_user_id: c.assigned_to?.id ?? null,
    assigned_user_name: c.assigned_to?.name ?? null,
    assigned_user_email: c.assigned_to?.email ?? null,
    contact_id: c.contact?.id ?? null,
    contact_name: contactName,
    contact_company: c.contact?.company_name ?? null,
    teams: (c.teams ?? []).map((t) => t.name).filter(Boolean),
    tags: (c.tags ?? []).map((t) => t.name).filter(Boolean),
    comments: (c.comments ?? []) as unknown as Record<string, unknown>[],
    recording_url: c.recording ?? null,
    voicemail_url: c.voicemail ?? null,
    asset_url: c.asset ?? null,
    raw: c as unknown as Record<string, unknown>,
    synced_at: new Date().toISOString(),
  };
}

// ------------------------------------------------------------
// Messages (Aircall Business Text Messaging — SMS / MMS).
// ------------------------------------------------------------

export interface AircallMessageObj {
  id?: number | string;
  direction?: string;
  status?: string;
  channel?: string;
  number_id?: number;
  number?: AircallNumber;
  to?: string;
  from?: string;
  body?: string;
  content?: string;
  media_url?: string;
  user?: AircallUser | null;
  sent_at?: number | string | null;
  received_at?: number | string | null;
  created_at?: number | string | null;
}

// Accept Aircall's unix-seconds, unix-millis, or an ISO string.
function anyToIso(v: number | string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return unixToIso(v);
  const ms = Date.parse(v);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

// Map an Aircall message object → aircall_messages row. The "contact" is
// always the OTHER party (the line is ours): inbound → `from` is the
// contact, outbound → `to` is the contact. contact_number (digits-only)
// is the thread key the Calls UI groups on.
export function mapAircallMessage(m: AircallMessageObj): Record<string, unknown> {
  const dir = (m.direction ?? '').toLowerCase();
  const isInbound = dir === 'inbound';
  const contactRaw = isInbound ? m.from : m.to;
  const lineRaw = isInbound ? m.to : m.from;
  const now = new Date().toISOString();
  return {
    aircall_message_id: m.id !== undefined && m.id !== null ? String(m.id) : null,
    direction: dir || null,
    status: m.status ?? null,
    channel: m.channel ?? null,
    number_id: m.number_id ?? m.number?.id ?? null,
    number_name: m.number?.name ?? null,
    number_digits: digitsOnly(m.number?.digits ?? lineRaw),
    contact_number: digitsOnly(contactRaw),
    raw_to: m.to ?? null,
    raw_from: m.from ?? null,
    body: (m.body ?? m.content ?? null) as string | null,
    media_url: m.media_url ?? null,
    user_id: m.user?.id ?? null,
    user_name: m.user?.name ?? null,
    sent_at: !isInbound ? (anyToIso(m.sent_at ?? m.created_at) ?? now) : anyToIso(m.sent_at),
    received_at: isInbound ? (anyToIso(m.received_at ?? m.created_at) ?? now) : anyToIso(m.received_at),
    raw: m as unknown as Record<string, unknown>,
  };
}

export interface SendMessageInput {
  numberId: number;
  to: string; // E.164
  body: string;
  mediaUrl?: string;
  // skip_inbox sends without threading into the Aircall agent inbox —
  // we keep the default (inbox) so messages also show in Aircall itself.
  skipInbox?: boolean;
}

// Send an SMS/MMS through Aircall. Returns the new message id when Aircall
// includes it in the response (it also fires a message.sent webhook, which
// is the source of truth for the persisted row).
export async function sendAircallMessage(input: SendMessageInput): Promise<{ id: string | null; raw: unknown }> {
  const path = input.skipInbox ? '/messages/skip_inbox' : '/messages';
  const payload: Record<string, unknown> = { number_id: input.numberId, to: input.to };
  if (input.body) payload.body = input.body;
  if (input.mediaUrl) payload.media_url = input.mediaUrl;
  const result = await aircallFetch<Record<string, unknown>>(path, { method: 'POST', body: payload });
  const msg = (result?.message ?? result) as { id?: unknown } | undefined;
  const id = msg?.id !== undefined && msg?.id !== null ? String(msg.id) : null;
  return { id, raw: result };
}

// ------------------------------------------------------------
// Conversation-Intelligence (AI) webhook helpers.
//
// The AI events (transcription.created, summary.created, topics.created,
// sentiment.created, …) carry the related call differently depending on
// the event, so probe a few shapes for the call id and best-effort
// extract the human-readable payload. Anything we can't model cleanly is
// still preserved under the `ai` jsonb keyed by event name.
// ------------------------------------------------------------

export function extractCallId(data: Record<string, unknown>): number | null {
  const candidates: unknown[] = [
    (data?.call as { id?: unknown })?.id,
    data?.call_id,
    data?.id,
  ];
  for (const v of candidates) {
    const n = typeof v === 'string' ? Number(v) : v;
    if (typeof n === 'number' && Number.isFinite(n)) return n;
  }
  return null;
}

// Flatten an Aircall transcription payload (an array of utterances, or
// a content string) into a single readable transcript.
export function extractTranscriptText(data: Record<string, unknown>): string | null {
  const t = (data?.transcription ?? data?.transcript ?? data) as Record<string, unknown>;
  const content = (t?.content ?? t?.text) as unknown;
  if (typeof content === 'string' && content.trim()) return content.trim();
  // Utterance array shape: [{ speaker_id|participant_type, text|words }].
  // The REST `/transcription` endpoint nests them under content.utterances;
  // the webhook payload carried them on the transcription object directly —
  // accept either, plus a bare array.
  const utterances = (
    Array.isArray((t as { utterances?: unknown })?.utterances)
      ? (t as { utterances?: unknown[] }).utterances
      : Array.isArray((content as { utterances?: unknown })?.utterances)
        ? (content as { utterances?: unknown[] }).utterances
        : content
  ) as unknown;
  if (Array.isArray(utterances)) {
    const lines = utterances
      .map((u) => {
        const speaker = (u?.participant_type ?? u?.speaker_id ?? u?.speaker ?? '') as string;
        const text = (u?.text ?? (Array.isArray(u?.words) ? u.words.map((w: { text?: string }) => w.text).join(' ') : '')) as string;
        if (!text) return '';
        return speaker ? `${speaker}: ${text}` : text;
      })
      .filter(Boolean);
    if (lines.length) return lines.join('\n');
  }
  return null;
}

export function extractSummaryText(data: Record<string, unknown>): string | null {
  const s = (data?.summary ?? data?.content) as unknown;
  if (typeof s === 'string' && s.trim()) return s.trim();
  const nested = (data?.summary as { content?: unknown })?.content;
  if (typeof nested === 'string' && nested.trim()) return nested.trim();
  return null;
}

export function extractTopics(data: Record<string, unknown>): string[] | null {
  const t = (data?.topics ?? (data?.topics as { content?: unknown })) as unknown;
  const arr = Array.isArray(t) ? t : Array.isArray((data?.topics as { content?: unknown })?.content) ? (data.topics as { content: unknown[] }).content : null;
  if (!arr) return null;
  const names = arr.map((x) => (typeof x === 'string' ? x : (x?.name ?? x?.label ?? x?.text))).filter((x): x is string => typeof x === 'string' && x.length > 0);
  return names.length ? names : null;
}

export function extractSentiment(data: Record<string, unknown>): string | null {
  const s = (data?.sentiment ?? (data?.sentiment as { value?: unknown })?.value ?? (data?.sentiment as { content?: unknown })?.content) as unknown;
  if (typeof s === 'string' && s.trim()) return s.trim();
  return null;
}
