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

const ALLOWED_METHODS = new Set(['Phone', 'In Person', 'Left Message']);
const TRANSCRIPT_BUCKET = 'contact-transcripts';
const TRANSCRIPT_MAX_CHARS = 250_000;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;

  let body: { method?: string; comments?: string; transcript?: string } = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const method = typeof body.method === 'string' ? body.method.trim() : '';
  if (!ALLOWED_METHODS.has(method)) {
    return NextResponse.json({ error: 'method must be Phone, In Person, or Left Message' }, { status: 400 });
  }
  const comments = typeof body.comments === 'string' ? body.comments.trim().slice(0, 4000) : null;
  const transcriptRaw = typeof body.transcript === 'string' ? body.transcript : '';
  const transcript = transcriptRaw.trim().slice(0, TRANSCRIPT_MAX_CHARS);

  const admin = getAdminSupabase();
  const now = new Date().toISOString();

  const { data: logRow, error: logErr } = await admin
    .from('contact_logs')
    .insert({
      contact_id: id,
      method,
      comments,
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

  const { data, error: updErr } = await admin
    .from('contacts')
    .update({
      last_contact_at: now,
      last_contact_by: user.id,
      last_contact_method: method,
      last_contact_comments: comments,
    })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  return NextResponse.json(data);
}
