import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/seo/directories/[id]/screenshots
//
// Upload one image attached to a SEO directory row. Authed admins
// only — the Directories page is admin-gated by PageGuard so we
// require is_admin here too rather than just any authenticated
// user. Files land in public-images bucket under
// seo-directory-screenshots/<directory_id>/... and a row is
// written to public.seo_directory_screenshots.
//
// Body: multipart/form-data with field name "file".

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BUCKET = 'public-images';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_PREFIXES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: directoryId } = await params;
  if (!directoryId) {
    return NextResponse.json({ error: 'Missing directory id' }, { status: 400 });
  }

  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: u } = await supabase
    .from('users')
    .select('is_admin, full_name')
    .eq('id', user.id)
    .maybeSingle();
  if (!u?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB)` },
      { status: 413 },
    );
  }
  const contentType = file.type || 'application/octet-stream';
  if (!ALLOWED_PREFIXES.some((p) => contentType.toLowerCase().startsWith(p))) {
    return NextResponse.json(
      { error: 'Only PNG / JPG / WebP / GIF images are allowed.' },
      { status: 415 },
    );
  }

  const ext = (() => {
    const m = file.name?.match(/\.([a-z0-9]{2,5})$/i);
    if (m) return m[1].toLowerCase();
    if (contentType.includes('jpeg')) return 'jpg';
    return contentType.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'png';
  })();
  // Sanitize directory_id for use in a path. directory_id is text
  // (matches existing curated slugs + UUIDs for custom dirs); strip
  // anything that isn't a-z0-9-_ to keep the path predictable.
  const safeDirId = directoryId.replace(/[^a-z0-9_-]/gi, '_');
  const path = `seo-directory-screenshots/${safeDirId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const admin = getAdminSupabase();
  const upload = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
    cacheControl: '604800',
  });
  if (upload.error) {
    return NextResponse.json(
      { error: `Storage upload failed: ${upload.error.message}` },
      { status: 502 },
    );
  }
  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = urlData?.publicUrl;
  if (!publicUrl) {
    return NextResponse.json({ error: 'No public URL for upload' }, { status: 502 });
  }

  const { data: row, error: insertError } = await admin
    .from('seo_directory_screenshots')
    .insert({
      directory_id: directoryId,
      storage_path: path,
      public_url: publicUrl,
      content_type: contentType,
      size_bytes: file.size,
      uploaded_by: user.id,
      uploaded_by_name: (u.full_name as string | null) ?? null,
    })
    .select('*')
    .single();
  if (insertError || !row) {
    // Clean up the orphaned blob if the row didn't write — keeps
    // the bucket from collecting unreferenced files.
    void admin.storage.from(BUCKET).remove([path]);
    return NextResponse.json(
      { error: insertError?.message ?? 'DB insert failed' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, screenshot: row });
}
