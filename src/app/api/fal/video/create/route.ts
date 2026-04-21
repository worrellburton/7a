import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase, getUserFromRequest } from '@/lib/supabase-server';
import { DEFAULT_VIDEO_MODEL_ID, findVideoModel } from '@/lib/videoModels';

const FAL_QUEUE_BASE = 'https://queue.fal.run';

// Every generation gets this directive prepended so output leans
// cinematic by default. Users can still add motion / scene detail on
// top in the textarea; it's appended after the prefix.
const CINEMATIC_PREFIX = 'Turn into a cinematic video.';

interface CreateBody {
  imageId?: string;
  imageUrl?: string;
  prompt?: string;
  duration?: number; // seconds
  resolution?: string;
  aspectRatio?: string;
  seed?: number;
  model?: string; // id from VIDEO_MODELS; defaults to Seedance Pro
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json(
      { error: 'FAL_KEY not configured — set it in the Vercel project env so image-to-video generation works.' },
      { status: 500 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as CreateBody;
  const { imageId, imageUrl, prompt, duration, resolution, aspectRatio, seed, model } = body;
  if (!imageUrl) {
    return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
  }

  // Resolve the model against our allowlist so the client can't point
  // fal.ai at an arbitrary endpoint we haven't vetted.
  const videoModel =
    findVideoModel(model) || findVideoModel(DEFAULT_VIDEO_MODEL_ID);
  if (!videoModel) {
    return NextResponse.json({ error: 'No video model available' }, { status: 500 });
  }

  const resolvedDuration = duration && videoModel.durations.includes(duration)
    ? duration
    : videoModel.durations[0];
  const resolvedResolution =
    resolution && videoModel.resolutions.includes(resolution)
      ? resolution
      : videoModel.resolutions[0] || null;
  const resolvedAspect =
    aspectRatio && videoModel.aspects.includes(aspectRatio)
      ? aspectRatio
      : videoModel.aspects[0] || null;

  const supabase = getAdminSupabase();

  const userPrompt = (prompt || '').trim();
  const finalPrompt = userPrompt
    ? `${CINEMATIC_PREFIX} ${userPrompt}`
    : CINEMATIC_PREFIX;

  // Each model builds its own payload — some fal endpoints want duration
  // as a string, some ignore resolution, some upper-case it, etc.
  const payload = videoModel.buildPayload({
    imageUrl,
    prompt: finalPrompt,
    duration: resolvedDuration,
    resolution: resolvedResolution,
    aspect: resolvedAspect,
    seed,
  });

  const falRes = await fetch(`${FAL_QUEUE_BASE}/${videoModel.endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!falRes.ok) {
    const text = await falRes.text();
    return NextResponse.json(
      { error: `fal.ai ${falRes.status}: ${text.slice(0, 500)}` },
      { status: 502 },
    );
  }

  const falJson = (await falRes.json()) as {
    request_id?: string;
    status_url?: string;
    response_url?: string;
    cancel_url?: string;
  };
  const requestId = falJson.request_id;
  if (!requestId) {
    return NextResponse.json(
      { error: 'fal.ai returned no request_id', raw: falJson },
      { status: 502 },
    );
  }

  const { data: row, error } = await supabase
    .from('site_videos')
    .insert({
      source_image_id: imageId || null,
      request_id: requestId,
      model_endpoint: videoModel.endpoint,
      prompt: finalPrompt,
      duration_seconds: resolvedDuration,
      resolution: resolvedResolution,
      aspect_ratio: resolvedAspect,
      seed: typeof seed === 'number' ? seed : null,
      status: 'queued',
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: `site_videos insert failed: ${error.message}`, request_id: requestId },
      { status: 500 },
    );
  }

  return NextResponse.json({ video: row });
}
