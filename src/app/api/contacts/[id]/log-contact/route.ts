import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';
import { summariseTranscript } from '@/lib/transcript-summary';

// POST /api/contacts/[id]/log-contact
//
// Records an interaction in public.contact_logs AND bumps the
// denormalised last_contact_* columns on public.contacts so the
// grid stays cheap to read. The grid uses optimistic UI on the
// client side; this route is the source of truth.
//
// Optional transcript:
//   When body.transcript is a non-empty string, we upload the raw
//   text to the private `contact-transcripts` bucket, fan a Claude
//   summary in parallel, and save the storage path + summary on the
//   resulting contact_log row. Failures on either side degrade
//   gracefully — the log row always saves; transcript_summary is
//   nullable if Claude is unreachable, transcript_storage_path is
//   nullable if Storage write fails.

export const dynamic = 'force-dynamic';

const ALLOWED_METHODS = new Set([
  'Phone',
  'In Person',
  'Left Message',
  'Text Message',
  'Email',
  'Smoke Signals',
  'Walkie Talkie',
  'Tin Can Phone',
]);
const TRANSCRIPT_BUCKET = 'contact-transcripts';
const TRANSCRIPT_MAX_CHARS = 250_000;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;

  let body: { method?: string; comments?: string; transcript?: string; duration_seconds?: unknown; follow_up_days?: number | null } = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const method = typeof body.method === 'string' ? body.method.trim() : '';
  if (!ALLOWED_METHODS.has(method)) {
    return NextResponse.json({ error: `method must be one of: ${Array.from(ALLOWED_METHODS).join(', ')}` }, { status: 400 });
  }
  const comments = typeof body.comments === 'string' ? body.comments.trim().slice(0, 4000) : null;
  const transcriptRaw = typeof body.transcript === 'string' ? body.transcript : '';
  const transcript = transcriptRaw.trim().slice(0, TRANSCRIPT_MAX_CHARS);

  // Duration in seconds is required. Voicemails auto-default to 30 on
  // the client; we still validate server-side so a malformed request
  // can't sneak a null past us.
  const durRaw = typeof body.duration_seconds === 'number'
    ? body.duration_seconds
    : typeof body.duration_seconds === 'string' && body.duration_seconds.trim()
    ? Number(body.duration_seconds)
    : NaN;
  if (!Number.isFinite(durRaw) || durRaw < 0 || durRaw > 60 * 60 * 12) {
    return NextResponse.json({ error: 'duration_seconds is required (0–43200)' }, { status: 400 });
  }
  const duration_seconds = Math.round(durRaw);

  // Optional follow-up scheduling. null/undefined leaves
  // follow_up_at untouched on the contacts row; a positive integer
  // (capped at 365) writes now() + days. Mirrors the contract on
  // /api/partnerships/[id]/log-contact.
  let followUpAt: string | null | undefined = undefined;
  if (body.follow_up_days === null) {
    followUpAt = null;
  } else if (typeof body.follow_up_days === 'number' && Number.isFinite(body.follow_up_days)) {
    const days = Math.floor(body.follow_up_days);
    if (days > 0 && days <= 365) {
      followUpAt = new Date(Date.now() + days * 86400000).toISOString();
    } else if (days === 0) {
      followUpAt = null;
    } else {
      return NextResponse.json({ error: 'follow_up_days must be between 1 and 365' }, { status: 400 });
    }
  }

  const admin = getAdminSupabase();
  const now = new Date().toISOString();

  const { data: logRow, error: logErr } = await admin
    .from('contact_logs')
    .insert({
      contact_id: id,
      method,
      comments,
      duration_seconds,
      contacted_by: user.id,
      contacted_at: now,
    })
    .select('id')
    .maybeSingle();
  if (logErr || !logRow) return NextResponse.json({ error: logErr?.message ?? 'log insert failed' }, { status: 500 });

  // Transcript handling — strictly best-effort. Either side can fail
  // and the log entry stays valid; the patches just won't show.
  if (transcript) {
    const path = `${id}/${logRow.id}.txt`;
    const [uploadResult, summary] = await Promise.all([
      admin.storage.from(TRANSCRIPT_BUCKET).upload(path, transcript, {
        contentType: 'text/plain; charset=utf-8',
        upsert: true,
      }),
      summariseTranscript(transcript),
    ]);
    const patch: Record<string, string | null> = {};
    if (!uploadResult.error) patch.transcript_storage_path = path;
    if (summary) patch.transcript_summary = summary;
    if (Object.keys(patch).length > 0) {
      await admin.from('contact_logs').update(patch).eq('id', logRow.id);
    }
  }

  const update: Record<string, unknown> = {
    last_contact_at: now,
    last_contact_by: user.id,
    last_contact_method: method,
    last_contact_comments: comments,
  };
  if (followUpAt !== undefined) update.follow_up_at = followUpAt;

  const { data, error: updErr } = await admin
    .from('contacts')
    .update(update)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // Surface every touchpoint on the global /app/activity feed.
  // Method lives in metadata so the feed UI can render a tinted
  // pill (Phone / In Person / Text / Email / …) per row.
  await admin.from('activity_log').insert({
    user_id: user.id,
    type: 'contact.logged',
    target_kind: 'contact',
    target_id: id,
    target_label: data?.name ?? null,
    target_path: '/app/outreach',
    metadata: { method, duration_seconds, comments: comments ?? null },
  });

  return NextResponse.json(data);
}
