import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/content-server';
import { isAudioConfigured, synthesizeLongForm } from '@/lib/content-audio';
import { rewriteForNarration } from '@/lib/content-claude';

// POST /api/content/[id]/audio — produce a "Road to Recovery" podcast
// MP3 for a blog using Claude (rewrite for narration) + ElevenLabs
// (TTS). Pipeline:
//
//   1. Pull the article body_markdown.
//   2. Send through Claude with the narration prompt to get a
//      podcast-polish plain-text script (same content, eye→ear edits).
//   3. Prepend the show intro ("Welcome to Seven Arrows Road to
//      Recovery…") and synthesize the intro + script through
//      ElevenLabs as two separate calls.
//   4. If a music bumper is on file (BLOG_INTRO_MUSIC_URL), splice it
//      between the intro and the script; otherwise just concatenate
//      the two voice tracks.
//   5. Upload the merged MP3 to the `blog-audio` Supabase bucket and
//      write blogs.audio_url back to the row.
//
// Super-admin only — same as every other write route in the content
// pipeline.

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BUCKET = 'blog-audio';

interface PostBody {
  /** Optional override — if provided, used verbatim as the TTS input.
   *  Defaults to the blog's body_markdown after a Claude rewrite pass. */
  text?: string;
  /** Optional voice override for one-off experiments. */
  voiceId?: string;
  /** When true, skip the Claude narration rewrite and TTS the
   *  body_markdown directly. Mostly useful for debugging — the
   *  default (false) runs the full podcast pipeline. */
  skipRewrite?: boolean;
  /** When true, skip the "Welcome to Seven Arrows Road to Recovery"
   *  intro sting. Default false. */
  skipIntro?: boolean;
}

function buildEpisodeIntro(blogTitle: string): string {
  // The script the host reads before the music sting kicks in. Kept
  // intentionally short so the listener gets to the meat of the
  // article quickly — the music bumper between intro and body is
  // where the pacing breath happens.
  const topic = blogTitle.trim() || 'recovery';
  return [
    'Welcome to Seven Arrows Road to Recovery.',
    `In this episode we will be exploring ${topic.toLowerCase().startsWith('the ') || topic.toLowerCase().startsWith('a ') ? topic.toLowerCase() : topic.toLowerCase()}.`,
    "Let's dive in.",
  ].join(' ');
}

function concatMp3(parts: ArrayBuffer[]): ArrayBuffer {
  // MP3 frames are self-contained, so concatenating two valid MP3
  // byte streams produces a playable file in every standard player
  // (ID3 tags from the first file persist; subsequent file metadata
  // is ignored, which is fine for our intro+body+music use). Anyone
  // re-encoding the result downstream gets clean audio either way.
  const total = parts.reduce((sum, p) => sum + p.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    merged.set(new Uint8Array(p), offset);
    offset += p.byteLength;
  }
  return merged.buffer;
}

async function loadIntroMusic(): Promise<ArrayBuffer | null> {
  // Optional — when BLOG_INTRO_MUSIC_URL is set, we fetch the music
  // bumper bytes and splice them between the spoken intro and the
  // article body. When the env is missing, the route ships intro +
  // body back-to-back with no music sting.
  const url = process.env.BLOG_INTRO_MUSIC_URL;
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.warn(`[audio] intro music fetch ${res.status} ${url}`);
      return null;
    }
    return await res.arrayBuffer();
  } catch (e) {
    console.warn('[audio] intro music fetch threw:', e);
    return null;
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isAudioConfigured()) {
    return NextResponse.json({ error: 'ELEVENLABS_API_KEY is not configured' }, { status: 503 });
  }
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;
  const { id } = await ctx.params;

  let body: PostBody = {};
  try { body = (await req.json()) as PostBody; } catch { /* allow empty */ }

  const admin = getAdminSupabase();
  const { data: blog, error: readErr } = await admin
    .from('blogs')
    .select('id, slug, title, body_markdown')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!blog) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // The route accepts a text override for debugging, but the normal
  // flow runs the body through Claude first to get the narration
  // script. Failures here surface to the caller — TTS without the
  // rewrite would produce eye-friendly prose read aloud, which is
  // notably worse than skipping audio entirely.
  const rawText = (body.text ?? blog.body_markdown ?? '').trim();
  if (!rawText) return NextResponse.json({ error: 'no text to synthesize' }, { status: 400 });

  let script: string;
  if (body.text || body.skipRewrite) {
    script = rawText;
  } else {
    try {
      script = await rewriteForNarration(rawText);
    } catch (e) {
      return NextResponse.json({ error: `narration rewrite failed: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
    }
  }

  // Synthesize the intro (short, one ElevenLabs call) and the body
  // (chunked long-form) separately so we can splice the music bumper
  // between them. Both calls reuse the same voice + model so the cut
  // sounds continuous.
  const introScript = body.skipIntro ? null : buildEpisodeIntro(blog.title ?? 'recovery');

  let introBytes: ArrayBuffer | null = null;
  let bodyBytes: ArrayBuffer;
  let voiceId = '';
  let modelId = '';
  let contentType = 'audio/mpeg';
  try {
    if (introScript) {
      const intro = await synthesizeLongForm(introScript, { voiceId: body.voiceId });
      introBytes = intro.audio;
      voiceId = intro.voiceId;
      modelId = intro.modelId;
      contentType = intro.contentType;
    }
    const bodyResult = await synthesizeLongForm(script, { voiceId: body.voiceId });
    bodyBytes = bodyResult.audio;
    voiceId = bodyResult.voiceId;
    modelId = bodyResult.modelId;
    contentType = bodyResult.contentType;
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }

  const musicBytes = introScript ? await loadIntroMusic() : null;
  const stitched: ArrayBuffer[] = [];
  if (introBytes) stitched.push(introBytes);
  if (musicBytes) stitched.push(musicBytes);
  stitched.push(bodyBytes);

  const result = {
    audio: concatMp3(stitched),
    voiceId,
    modelId,
    contentType,
    hasIntro: !!introBytes,
    hasMusic: !!musicBytes,
  };

  // Upload the MP3 to Supabase Storage. The bucket is created on first
  // use via the migration in supabase/migrations/; the path is the blog
  // slug so the public URL is stable across re-runs.
  const path = `${blog.slug || blog.id}.mp3`;
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, result.audio, {
      contentType: result.contentType,
      upsert: true,
    });
  if (upErr) {
    return NextResponse.json({ error: `storage upload failed: ${upErr.message}` }, { status: 500 });
  }
  const { data: publicUrl } = admin.storage.from(BUCKET).getPublicUrl(path);
  const audioUrl = publicUrl.publicUrl;

  // Persist the URL on the blog row so the public renderer can mount
  // an audio player without round-tripping through storage on every
  // request. Soft-failure: a missing column means an older deployment
  // hasn't migrated yet; the route still returns the URL so a manual
  // backfill is possible.
  const { error: updateErr } = await admin
    .from('blogs')
    .update({ audio_url: audioUrl })
    .eq('id', id);
  if (updateErr) {
    return NextResponse.json({
      ok: true,
      url: audioUrl,
      persisted: false,
      warning: `audio uploaded but not stored on blog row: ${updateErr.message}`,
      voiceId: result.voiceId,
      modelId: result.modelId,
      contentType: result.contentType,
      bytes: result.audio.byteLength,
      hasIntro: result.hasIntro,
      hasMusic: result.hasMusic,
    });
  }

  return NextResponse.json({
    ok: true,
    url: audioUrl,
    persisted: true,
    voiceId: result.voiceId,
    modelId: result.modelId,
    contentType: result.contentType,
    bytes: result.audio.byteLength,
    hasIntro: result.hasIntro,
    hasMusic: result.hasMusic,
  });
}
