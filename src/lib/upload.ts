import { logActivity } from './activity';
import { supabase } from './supabase';

// Resize + recompress an image File so it stays comfortably under Vercel's
// serverless body limit (~4.5 MB). Modern phone photos are routinely 5-10 MB,
// which trips a 413 at the API route. Non-image files pass through untouched.
//
// We downscale so the longest edge is at most `maxEdge`, then encode as JPEG
// at progressively lower quality until the result fits under `targetBytes`.
// The original filename is preserved (with a .jpg extension when re-encoded).
export async function compressImage(
  file: File,
  opts: { maxEdge?: number; targetBytes?: number } = {}
): Promise<File> {
  const maxEdge = opts.maxEdge ?? 2000;
  const targetBytes = opts.targetBytes ?? 3.5 * 1024 * 1024;
  if (!file.type.startsWith('image/')) return file;
  // Don't bother re-encoding small images — saves CPU and avoids the slight
  // quality loss of a JPEG round-trip.
  if (file.size <= targetBytes && file.type !== 'image/heic' && file.type !== 'image/heif') {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) return file;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    let quality = 0.85;
    let blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
    while (blob && blob.size > targetBytes && quality > 0.4) {
      quality -= 0.1;
      blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
    }
    if (!blob) return file;
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}

// Upload a file directly to Supabase Storage from the browser. This bypasses
// the Next.js API route entirely, so we are not constrained by Vercel's
// ~4.5 MB serverless body limit — Supabase's per-bucket file_size_limit
// applies instead (currently uncapped on these public buckets). Image files
// are still compressed first so we don't waste bandwidth on multi-MB phone
// photos for what end up as ~80 KB issue thumbnails. Storage RLS scopes
// uploads to the caller's own user-id folder (see migration
// `storage_direct_upload_policies`).
export async function uploadFile(file: File, bucket?: string): Promise<{ url: string | null; error: string | null }> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) {
      return { url: null, error: 'Not authenticated — please sign in again.' };
    }

    const prepared = await compressImage(file);
    const targetBucket = bucket || 'issue-photos';
    const ext = (prepared.name.split('.').pop() || 'bin').toLowerCase();
    const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from(targetBucket)
      .upload(path, prepared, {
        contentType: prepared.type || 'application/octet-stream',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      return { url: null, error: error.message };
    }

    const { data: urlData } = supabase.storage.from(targetBucket).getPublicUrl(path);
    const url = urlData?.publicUrl || null;

    // Fire-and-forget activity log so admins can see every upload.
    if (url) {
      logActivity({
        userId: uid,
        type: 'doc.uploaded',
        targetKind: 'file',
        targetLabel: file.name,
        metadata: { bucket: targetBucket, size: prepared.size, mime: prepared.type, url },
      });
    }

    return { url, error: url ? null : 'No URL returned from upload.' };
  } catch (err) {
    return { url: null, error: String(err) };
  }
}
