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

// SEO-focused compression for the Images gallery. Outputs WebP when the
// browser supports it (~40% smaller than JPEG at equivalent visual quality),
// falls back to JPEG otherwise. Max edge 2048px / ~1 MB target with a 0.75
// quality floor — high enough that gallery images reused for social posts
// stay crisp after Instagram/Ayrshare re-compress them, while still cutting
// most originals down meaningfully for the website.
export interface CompressStats {
  file: File;
  originalBytes: number;
  compressedBytes: number;
  savedPercent: number;
  format: 'webp' | 'jpeg' | 'passthrough';
  finalQuality: number;
  width: number;
  height: number;
}

export async function compressForSeo(
  file: File,
  opts: { maxEdge?: number; targetBytes?: number; baseName?: string } = {}
): Promise<CompressStats> {
  const maxEdge = opts.maxEdge ?? 2048;
  const targetBytes = opts.targetBytes ?? 1024 * 1024;

  // Non-image: pass through untouched.
  if (!file.type.startsWith('image/')) {
    return {
      file,
      originalBytes: file.size,
      compressedBytes: file.size,
      savedPercent: 0,
      format: 'passthrough',
      finalQuality: 1,
      width: 0,
      height: 0,
    };
  }

  try {
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) {
      return {
        file,
        originalBytes: file.size,
        compressedBytes: file.size,
        savedPercent: 0,
        format: 'passthrough',
        finalQuality: 1,
        width: 0,
        height: 0,
      };
    }

    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    // High-quality resampling for the downscale. Browsers default to low
    // quality on `drawImage`, which is fine for thumbnails but bad when we
    // only get to encode the image once.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    // Try WebP first with a quality ramp-down. If the browser doesn't know
    // WebP (very rare — Safari 14+ has it) the canvas falls back to PNG
    // which we treat as unsupported and retry as JPEG.
    async function encode(type: 'image/webp' | 'image/jpeg', q: number): Promise<Blob | null> {
      const blob: Blob | null = await new Promise((res) =>
        canvas.toBlob(res, type, q),
      );
      // Some browsers silently emit PNG when asked for an unsupported type —
      // detect via blob.type.
      if (!blob || (type === 'image/webp' && blob.type !== 'image/webp')) {
        return null;
      }
      return blob;
    }

    // Quality floor raised to 0.75 — below that, photos posted to social
    // show visible JPEG/WebP artifacts once the platform re-compresses.
    // If a huge original can't fit the ~1 MB target even at 0.75, we keep
    // the 0.75 encode rather than degrading further; the larger file is an
    // acceptable trade for not shipping a mushy image to Instagram.
    const qualitySteps = [0.9, 0.85, 0.8, 0.75];
    let best: { blob: Blob; quality: number; format: 'webp' | 'jpeg' } | null = null;

    // Prefer WebP if supported.
    for (const q of qualitySteps) {
      const blob = await encode('image/webp', q);
      if (!blob) break; // WebP not supported — exit loop, fall to JPEG.
      best = { blob, quality: q, format: 'webp' };
      if (blob.size <= targetBytes) break;
    }

    if (!best || best.format !== 'webp') {
      // Fall back to JPEG.
      for (const q of qualitySteps) {
        const blob = await encode('image/jpeg', q);
        if (!blob) break;
        best = { blob, quality: q, format: 'jpeg' };
        if (blob.size <= targetBytes) break;
      }
    }

    if (!best) throw new Error('encoder failed');

    const baseName =
      opts.baseName ??
      file.name.replace(/\.[^.]+$/, '') ??
      'photo';
    const ext = best.format === 'webp' ? 'webp' : 'jpg';
    const outFile = new File([best.blob], `${baseName}.${ext}`, {
      type: best.format === 'webp' ? 'image/webp' : 'image/jpeg',
      lastModified: Date.now(),
    });

    const originalBytes = file.size;
    const compressedBytes = outFile.size;
    const savedPercent =
      originalBytes > 0
        ? Math.max(0, Math.round(((originalBytes - compressedBytes) / originalBytes) * 100))
        : 0;

    return {
      file: outFile,
      originalBytes,
      compressedBytes,
      savedPercent,
      format: best.format,
      finalQuality: best.quality,
      width: w,
      height: h,
    };
  } catch {
    return {
      file,
      originalBytes: file.size,
      compressedBytes: file.size,
      savedPercent: 0,
      format: 'passthrough',
      finalQuality: 1,
      width: 0,
      height: 0,
    };
  }
}

// Generate a tiny 60×60 WebP avatar from an image File and return it as
// a `data:image/webp;base64,...` string. Stored on users.avatar_thumb so
// the home orbit can paint without per-avatar HTTP fetches.
//
// Square-center-crops the source so portrait + landscape sources both
// fill the circle. Quality 0.6 keeps the result under ~3 KB while still
// looking sharp at the rendered 28-48px sizes. Falls back to null on
// any browser/canvas hiccup — caller should not error, the orbit
// already degrades gracefully to avatar_url.
export async function generateAvatarThumbDataUrl(
  file: Blob,
  size = 60,
): Promise<string | null> {
  if (typeof document === 'undefined') return null;
  try {
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) return null;
    const srcEdge = Math.min(bitmap.width, bitmap.height);
    const sx = Math.floor((bitmap.width - srcEdge) / 2);
    const sy = Math.floor((bitmap.height - srcEdge) / 2);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, sx, sy, srcEdge, srcEdge, 0, 0, size, size);
    bitmap.close?.();
    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob(res, 'image/webp', 0.6),
    );
    if (!blob || blob.type !== 'image/webp') return null;
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    // Base64-encode via a chunked btoa so we don't blow the call stack
    // on String.fromCharCode(...big_array). 60×60 WebP is small enough
    // that this is almost always a single chunk.
    let binary = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return `data:image/webp;base64,${btoa(binary)}`;
  } catch {
    return null;
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
