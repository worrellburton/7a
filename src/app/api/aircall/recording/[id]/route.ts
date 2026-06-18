import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/api-gates';
import { aircallAuthHeader, aircallFetch, type AircallCall } from '@/lib/aircall';

// GET /api/aircall/recording/[id]?type=recording|voicemail
//
// Authenticated streaming proxy for a call's recording or voicemail.
// The audio is piped *through* feather rather than handed to the browser
// as a raw Aircall URL, which means:
//   - an <audio> element can play it without any client-side Aircall
//     credentials,
//   - the underlying media URL (potentially PHI) never reaches the
//     client, and
//   - expired / short-lived Aircall media URLs are transparently
//     refreshed from the Aircall API at play time.
//
// Auth is via the cookie session (requireStaff() with no request arg)
// because an <audio src> can't carry an Authorization header. Range
// requests are forwarded so the player can seek. Staff-only — the media
// is PHI, so alumni / guest accounts are rejected here too.

function attachAuthIfAircall(target: string, headers: Record<string, string>) {
  try {
    if (new URL(target).hostname.endsWith('aircall.io')) {
      const auth = aircallAuthHeader();
      if (auth) headers['Authorization'] = auth;
    }
  } catch { /* malformed URL — skip */ }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireStaff();
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const aircallId = Number(id);
  if (!Number.isFinite(aircallId)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const sp = new URL(req.url).searchParams;
  const wantVoicemail = sp.get('type') === 'voicemail';
  const wantDownload = sp.get('download') === '1';

  const { data } = await gate.admin
    .from('aircall_calls')
    .select('recording_url, voicemail_url')
    .eq('aircall_id', aircallId)
    .maybeSingle();
  let mediaUrl: string | null = wantVoicemail ? (data?.voicemail_url ?? null) : (data?.recording_url ?? null);

  const range = req.headers.get('range') || undefined;
  const fetchMedia = (target: string) => {
    const headers: Record<string, string> = {};
    if (range) headers['Range'] = range;
    attachAuthIfAircall(target, headers);
    return fetch(target, { headers }).catch(() => null);
  };

  const ok = (r: Response | null): r is Response => !!r && (r.ok || r.status === 206) && !!r.body;

  let upstream = mediaUrl ? await fetchMedia(mediaUrl) : null;

  // Stale or missing → ask Aircall for a fresh URL and retry once.
  if (!ok(upstream)) {
    try {
      const fresh = await aircallFetch<{ call?: AircallCall }>(`/calls/${aircallId}`);
      const refreshed = wantVoicemail ? fresh.call?.voicemail : fresh.call?.recording;
      if (refreshed) {
        mediaUrl = refreshed;
        upstream = await fetchMedia(refreshed);
      }
    } catch { /* fall through to 404 */ }
  }

  if (!ok(upstream)) {
    return NextResponse.json({ error: 'recording unavailable' }, { status: 404 });
  }

  const headers = new Headers();
  headers.set('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg');
  headers.set('Accept-Ranges', 'bytes');
  const len = upstream.headers.get('content-length');
  if (len) headers.set('Content-Length', len);
  const cr = upstream.headers.get('content-range');
  if (cr) headers.set('Content-Range', cr);
  // Recording audio may be PHI — keep it out of shared caches.
  headers.set('Cache-Control', 'private, no-store');
  if (wantDownload) {
    headers.set('Content-Disposition', `attachment; filename="aircall-call-${aircallId}${wantVoicemail ? '-voicemail' : ''}.mp3"`);
  }

  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
