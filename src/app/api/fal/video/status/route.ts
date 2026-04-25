import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdminSupabase, getUserFromRequest } from '@/lib/supabase-server';

const FAL_QUEUE_BASE = 'https://queue.fal.run';

// fal.ai's queue status + result endpoints are keyed to the app id
// ({owner}/{alias}) — not the full submission endpoint path. GETting
// `queue.fal.run/fal-ai/bytedance/seedance/v1/pro/image-to-video/requests/{id}/status`
// returns 405 Method Not Allowed even though fal's OpenAPI lists it; the
// production router only accepts the short form. The official fal-js SDK
// derives the same prefix from `parseEndpointId`, which for
// "fal-ai/bytedance/seedance/..." yields owner="fal-ai", alias="bytedance".
// We copy that behavior: first two slash-separated segments of the
// submission endpoint.
function queueAppId(endpoint: string): string {
  return endpoint.split('/').slice(0, 2).join('/');
}

// We archive fal.ai's CDN output into our own Supabase Storage so the
// URL we hand to the site outlives fal's CDN retention window (fal
// rotates files). Videos + thumbnails go under a site-videos/ prefix
// in the existing public-images bucket.
const ARCHIVE_BUCKET = 'public-images';
const ARCHIVE_PREFIX = 'site-videos';

// Copy a fal URL into our storage bucket and return the public URL.
// On any failure, returns null so callers can fall back to the fal URL
// (short-term link still works; we just didn't archive this time).
async function archiveAsset(
  supabase: SupabaseClient,
  sourceUrl: string,
  storagePath: string,
  contentType: string,
): Promise<string | null> {
  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) {
      console.error('[video/status] fal asset fetch failed', res.status, storagePath);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const { error: upErr } = await supabase.storage
      .from(ARCHIVE_BUCKET)
      .upload(storagePath, buf, {
        contentType,
        upsert: true,
        cacheControl: '31536000',
      });
    if (upErr) {
      console.error('[video/status] supabase upload failed', upErr.message, storagePath);
      return null;
    }
    const { data: pub } = supabase.storage.from(ARCHIVE_BUCKET).getPublicUrl(storagePath);
    return pub?.publicUrl || null;
  } catch (err) {
    console.error('[video/status] archive error', err, storagePath);
    return null;
  }
}

// Poll fal.ai for a given site_videos row, update the local row when
// it transitions, and return the refreshed row. Callers just hit this
// on an interval per queued/in-progress video and stop when status
// becomes `completed` or `failed`.
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 500 });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const supabase = getAdminSupabase();
  const { data: row, error: loadErr } = await supabase
    .from('site_videos')
    .select('*')
    .eq('id', id)
    .single();

  if (loadErr || !row) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  // Already resolved — skip the network call.
  if (row.status === 'completed' || row.status === 'failed' || row.status === 'canceled') {
    return NextResponse.json({ video: row });
  }

  if (!row.request_id) {
    return NextResponse.json({ error: 'Video has no request_id to poll' }, { status: 400 });
  }

  const appId = queueAppId(row.model_endpoint);
  const statusUrl = `${FAL_QUEUE_BASE}/${appId}/requests/${row.request_id}/status`;
  const queuedForSeconds = Math.round((Date.now() - new Date(row.created_at).getTime()) / 1000);
  const statusRes = await fetch(statusUrl, {
    headers: { Authorization: `Key ${falKey}` },
  });

  // Diagnostic blob written to row.debug_info on every poll so
  // "stuck in queue" reports have an evidence trail. Updated below
  // with the parsed status / logs once we've read the response.
  const debug: {
    last_polled_at: string;
    queued_for_seconds: number;
    app_id: string;
    request_id: string;
    status_url: string;
    fal_status_http: number;
    fal_status?: string;
    fal_logs?: string[];
    fal_error_body?: string;
  } = {
    last_polled_at: new Date().toISOString(),
    queued_for_seconds: queuedForSeconds,
    app_id: appId,
    request_id: String(row.request_id),
    status_url: statusUrl,
    fal_status_http: statusRes.status,
  };

  // If fal.ai's status endpoint errors (404 for unknown endpoint, 401 for
  // bad key, 5xx when fal is sick), record the upstream error on the row
  // itself — otherwise a misbehaving request sits in `queued` forever and
  // the user has no signal as to why. We only auto-fail the row once the
  // job has been queued long enough that fal almost certainly isn't just
  // being slow (>5 min). Short transient errors remain quiet.
  if (!statusRes.ok) {
    const text = await statusRes.text();
    const upstreamError = `fal.ai status ${statusRes.status}: ${text.slice(0, 500)}`;
    debug.fal_error_body = text.slice(0, 800);
    const queuedForMs = Date.now() - new Date(row.created_at).getTime();
    const shouldPersist = queuedForMs > 5 * 60 * 1000;
    if (shouldPersist) {
      await supabase
        .from('site_videos')
        .update({
          status: 'failed',
          error: upstreamError,
          debug_info: debug,
          completed_at: new Date().toISOString(),
        })
        .eq('id', id);
    } else {
      // Even when we don't fail the row yet, persist the diagnostic
      // so the user can see why it's still pending.
      await supabase.from('site_videos').update({ debug_info: debug }).eq('id', id);
    }
    return NextResponse.json(
      { error: upstreamError, video: row, debug_info: debug },
      { status: 502 },
    );
  }

  const statusJson = (await statusRes.json()) as {
    status?: string;
    logs?: Array<{ message?: string }>;
  };
  const falStatus = (statusJson.status || '').toUpperCase();
  debug.fal_status = falStatus || statusJson.status || '';
  debug.fal_logs = (statusJson.logs ?? [])
    .map((l) => (typeof l?.message === 'string' ? l.message : ''))
    .filter(Boolean)
    .slice(-10);

  let nextStatus: string = row.status;
  if (falStatus === 'IN_QUEUE') nextStatus = 'queued';
  else if (falStatus === 'IN_PROGRESS') nextStatus = 'in_progress';
  else if (falStatus === 'COMPLETED') nextStatus = 'completed';
  else if (falStatus === 'FAILED') nextStatus = 'failed';

  let videoUrl: string | null = row.video_url;
  let thumbnailUrl: string | null = row.thumbnail_url;
  let errorMsg: string | null = row.error;

  // When complete, fetch the response body to extract the video URL,
  // then copy the asset into our own Supabase Storage so we don't
  // depend on fal's CDN retention. If archiving fails for any reason,
  // fall back to the fal URL so the link still works short-term.
  if (nextStatus === 'completed' && !videoUrl) {
    const resultRes = await fetch(
      `${FAL_QUEUE_BASE}/${appId}/requests/${row.request_id}`,
      { headers: { Authorization: `Key ${falKey}` } },
    );
    if (resultRes.ok) {
      // fal's newer endpoints (Seedance 2, some Kling tags) wrap the
      // result under `output`, `data`, or even just return a string
      // URL. Accept every shape we've seen so upgrades don't silently
      // produce poster-only rows.
      type Wrap = {
        video?: { url?: string } | string;
        video_url?: string;
        videos?: Array<{ url?: string } | string>;
        url?: string;
        thumbnail?: { url?: string } | string;
        thumbnail_url?: string;
      };
      const resultJson = (await resultRes.json()) as Wrap & {
        output?: Wrap;
        data?: Wrap;
      };

      // Walk a value tree and pull the first plausible video URL out.
      // Saves us from listing every permutation of fal's response shapes.
      const looksLikeVideoUrl = (s: string) =>
        /^https?:\/\//.test(s) && /\.(mp4|mov|webm)(\?|$)/i.test(s);
      const looksLikeImageUrl = (s: string) =>
        /^https?:\/\//.test(s) && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(s);
      function findUrl(
        node: unknown,
        match: (s: string) => boolean,
        depth = 0,
      ): string | null {
        if (!node || depth > 6) return null;
        if (typeof node === 'string') return match(node) ? node : null;
        if (Array.isArray(node)) {
          for (const v of node) { const u = findUrl(v, match, depth + 1); if (u) return u; }
          return null;
        }
        if (typeof node === 'object') {
          for (const v of Object.values(node as Record<string, unknown>)) {
            const u = findUrl(v, match, depth + 1);
            if (u) return u;
          }
        }
        return null;
      }

      const out = resultJson.output ?? {};
      const data = resultJson.data ?? {};
      const directVideo =
        (typeof resultJson.video === 'object' && resultJson.video?.url) ||
        (typeof resultJson.video === 'string' ? resultJson.video : null) ||
        resultJson.video_url ||
        (typeof out.video === 'object' && out.video?.url) ||
        (typeof out.video === 'string' ? out.video : null) ||
        out.video_url ||
        (typeof data.video === 'object' && data.video?.url) ||
        (typeof data.video === 'string' ? data.video : null) ||
        data.video_url ||
        null;
      const falVideoUrl = directVideo || findUrl(resultJson, looksLikeVideoUrl);
      const falThumbUrl =
        (typeof resultJson.thumbnail === 'object' && resultJson.thumbnail?.url) ||
        (typeof resultJson.thumbnail === 'string' ? resultJson.thumbnail : null) ||
        resultJson.thumbnail_url ||
        (typeof out.thumbnail === 'object' && out.thumbnail?.url) ||
        (typeof out.thumbnail === 'string' ? out.thumbnail : null) ||
        out.thumbnail_url ||
        findUrl(resultJson, looksLikeImageUrl) ||
        null;

      if (falVideoUrl) {
        const archivedVideo = await archiveAsset(
          supabase,
          falVideoUrl,
          `${ARCHIVE_PREFIX}/${row.id}.mp4`,
          'video/mp4',
        );
        videoUrl = archivedVideo || falVideoUrl;
      } else {
        // fal.ai signaled COMPLETED but the response didn't contain a
        // video URL anywhere we could find. Don't silently leave the
        // row playable-less — flip to failed and stash a snippet of
        // the raw payload on `error` so we can adapt the parser.
        // Saw this with Seedance 2.0 where fal returned an empty
        // result on a 5-second "completion" (likely a soft quota
        // failure or an endpoint slug that no longer exists).
        nextStatus = 'failed';
        const snippet = JSON.stringify(resultJson).slice(0, 800);
        errorMsg = `fal.ai marked COMPLETED but no video URL in response. Raw: ${snippet}`;
      }
      if (falThumbUrl) {
        const archivedThumb = await archiveAsset(
          supabase,
          falThumbUrl,
          `${ARCHIVE_PREFIX}/${row.id}-thumb.jpg`,
          'image/jpeg',
        );
        thumbnailUrl = archivedThumb || falThumbUrl;
      }
    } else {
      // Couldn't even fetch the result — surface the upstream status
      // so users see WHY the row is broken instead of a green "done".
      const text = await resultRes.text();
      nextStatus = 'failed';
      errorMsg = `fal.ai result fetch ${resultRes.status}: ${text.slice(0, 500)}`;
    }
  }

  if (nextStatus === 'failed') {
    const lastLog = (statusJson.logs || []).slice(-1)[0]?.message;
    errorMsg = lastLog || errorMsg || 'fal.ai reported failure';
  }

  // Always write the latest debug snapshot back so /app/video can
  // surface "what fal said on the last poll". When something else
  // changed too (status / urls), bundle it into the same UPDATE
  // so we don't make two roundtrips per poll.
  const stateChanged =
    nextStatus !== row.status ||
    videoUrl !== row.video_url ||
    thumbnailUrl !== row.thumbnail_url;

  const updatePayload: Record<string, unknown> = { debug_info: debug };
  if (stateChanged) {
    updatePayload.status = nextStatus;
    updatePayload.video_url = videoUrl;
    updatePayload.thumbnail_url = thumbnailUrl;
    updatePayload.error = errorMsg;
    if (nextStatus === 'completed' || nextStatus === 'failed') {
      updatePayload.completed_at = new Date().toISOString();
    }
  }

  const { data: updated, error: upErr } = await supabase
    .from('site_videos')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();
  if (upErr) {
    return NextResponse.json({ error: upErr.message, video: row, debug_info: debug }, { status: 500 });
  }
  return NextResponse.json({ video: updated, debug_info: debug });
}
