import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/content-server';
import { generateImageConcepts } from '@/lib/content-claude';
import { generateWithGptImage, type GeneratedImage } from '@/lib/content-images';

// GET  /api/content/[id]/images       — list current blog_images
// POST /api/content/[id]/images       — phase 6: generate 10 images
//                                       (all via gpt-image-2)
//
// The POST handler is synchronous-ish: it runs all 10 generations in
// parallel and waits for completion, then inserts blog_images rows
// and bumps blog.status to 'selecting'. Total wall time is roughly
// gpt-image-2 latency since each call runs concurrently. We persist
// each upload to Supabase Storage so the URLs survive after fal's CDN
// purges its temporary cache.

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BUCKET = 'blog-images';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;
  const { id } = await ctx.params;
  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('blog_images')
    .select('*')
    .eq('blog_id', id)
    .order('position', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ images: data ?? [] });
}

async function persistImage(blogId: string, img: GeneratedImage, position: number): Promise<{ id: string; url: string }> {
  const admin = getAdminSupabase();
  // Download the fal CDN bytes and re-upload to our storage bucket so
  // the URL is durable.
  const bin = await fetch(img.url);
  if (!bin.ok) throw new Error(`download ${img.provider} image failed: ${bin.status}`);
  const blob = await bin.arrayBuffer();
  const contentType = bin.headers.get('content-type') ?? 'image/png';
  const ext = contentType.includes('jpeg') ? 'jpg' : contentType.includes('webp') ? 'webp' : 'png';
  const path = `${blogId}/${position}-${img.provider}.${ext}`;
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, blob, { contentType, upsert: true });
  if (upErr) throw new Error(`storage upload failed: ${upErr.message}`);
  const { data: publicUrl } = admin.storage.from(BUCKET).getPublicUrl(path);
  const url = publicUrl.publicUrl;
  const { data, error } = await admin
    .from('blog_images')
    .insert({
      blog_id: blogId,
      provider: img.provider,
      url,
      prompt: img.prompt,
      alt: img.alt,
      position,
    })
    .select('id, url')
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id as string, url };
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;
  const { id } = await ctx.params;

  const admin = getAdminSupabase();
  const { data: blog, error: readErr } = await admin
    .from('blogs')
    .select('id, title, body_markdown, status')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!blog) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!blog.body_markdown) return NextResponse.json({ error: 'no body to illustrate yet' }, { status: 400 });

  // Clear any previous image set so a re-run doesn't double up.
  await admin.from('blog_images').delete().eq('blog_id', id);
  await admin.from('blogs').update({ status: 'images', selected_image_ids: null }).eq('id', id);

  // 1) Ask Claude for 10 distinct visual concepts.
  let concepts: { prompt: string; alt: string }[];
  try {
    concepts = await generateImageConcepts(blog.body_markdown, blog.title ?? 'Untitled');
  } catch (e) {
    return NextResponse.json({ error: `concept stage failed: ${e instanceof Error ? e.message : String(e)}` }, { status: 503 });
  }

  // 2) Fire all 10 generations through gpt-image-2 in parallel.
  const jobs = concepts.map((c, idx) => {
    return generateWithGptImage(c.prompt, c.alt)
      .then((img) => ({ ok: true as const, img, position: idx }))
      .catch((err) => ({ ok: false as const, error: err instanceof Error ? err.message : String(err), position: idx }));
  });
  const results = await Promise.all(jobs);

  // 3) Persist successes; collect failures so the UI can surface them.
  const persisted: { id: string; url: string; position: number }[] = [];
  const failures: { position: number; error: string }[] = [];
  for (const r of results) {
    if (!r.ok) { failures.push({ position: r.position, error: r.error }); continue; }
    try {
      const saved = await persistImage(id, r.img, r.position);
      persisted.push({ ...saved, position: r.position });
    } catch (e) {
      failures.push({ position: r.position, error: e instanceof Error ? e.message : String(e) });
    }
  }

  if (persisted.length === 0) {
    // Roll status back so the UI doesn't stay stuck on the swirling
    // placeholder grid waiting for images that will never arrive —
    // the user should land back in the Review panel, see the copyable
    // error, and be able to retry.
    await admin.from('blogs').update({ status: 'review' }).eq('id', id);
    return NextResponse.json({ error: 'all image generations failed', failures }, { status: 503 });
  }

  await admin.from('blogs').update({ status: 'selecting' }).eq('id', id);
  return NextResponse.json({ ok: true, generated: persisted.length, failures });
}
