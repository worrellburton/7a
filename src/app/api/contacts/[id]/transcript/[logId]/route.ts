import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/contacts/[id]/transcript/[logId]
//
// Streams the raw transcript text for a contact_log entry. The
// transcript lives in a PRIVATE Supabase Storage bucket; the route
// reads it with the service-role key after verifying the caller's
// Supabase JWT, so the browser never needs a Storage token.
//
// Returns 404 if the log row doesn't exist, doesn't belong to the
// given contact, or has no transcript attached.

export const dynamic = 'force-dynamic';

const TRANSCRIPT_BUCKET = 'contact-transcripts';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; logId: string }> },
) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, logId } = await ctx.params;

  const admin = getAdminSupabase();
  const { data: log, error } = await admin
    .from('contact_logs')
    .select('contact_id, transcript_storage_path')
    .eq('id', logId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!log || log.contact_id !== id || !log.transcript_storage_path) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: file, error: dlErr } = await admin
    .storage
    .from(TRANSCRIPT_BUCKET)
    .download(log.transcript_storage_path as string);
  if (dlErr || !file) return NextResponse.json({ error: dlErr?.message ?? 'Storage read failed' }, { status: 500 });

  const text = await file.text();
  return new NextResponse(text, {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'private, no-store',
    },
  });
}
