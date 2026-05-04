import { supabase } from '@/lib/supabase';

// Screenshot upload helper for /app/seo/actions. Pushes a single
// File into the `public-images` bucket under seo-actions/<uuid>.<ext>
// and returns the public URL the API caller can drop into
// screenshot_urls.
//
// The bucket already serves any /storage/v1/object/public/<bucket>/…
// asset over HTTPS; rather than minting signed URLs (24h max), we
// keep these URLs permanent so they don't rot inside saved actions.
//
// Errors propagate. Callers wrap in their own UI-state try/catch
// because a single failed upload shouldn't kill a multi-file batch.

const BUCKET = 'public-images';
const PREFIX = 'seo-actions';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — paste-from-clipboard PNGs comfortably fit

const ALLOWED_PREFIXES = ['image/'];

export interface UploadedScreenshot {
  url: string;
  path: string;
  bytes: number;
  mime: string;
}

function safeExtension(file: File): string {
  // Prefer the mime type because filenames from a paste-image event
  // are often "image.png" or unset; but fall back to the original
  // extension when present.
  const fromMime = (file.type || '').split('/')[1] ?? '';
  if (fromMime) return fromMime.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 6) || 'png';
  const fromName = file.name.split('.').pop() ?? '';
  return fromName.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 6) || 'png';
}

function randomId(): string {
  // Browser-safe UUID with a fallback for older Safari that doesn't
  // expose crypto.randomUUID.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC4122-ish fallback — good enough for storage path uniqueness.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function uploadActionScreenshot(file: File): Promise<UploadedScreenshot> {
  if (!ALLOWED_PREFIXES.some((p) => (file.type || '').startsWith(p))) {
    throw new Error(`Only image files can be attached (got ${file.type || 'unknown'})`);
  }
  if (file.size > MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new Error(`Screenshot is ${mb} MB; the cap is ${MAX_BYTES / 1024 / 1024} MB`);
  }
  const ext = safeExtension(file);
  const path = `${PREFIX}/${randomId()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '604800',
    contentType: file.type || `image/${ext}`,
    upsert: false,
  });
  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error('Upload completed but no public URL was returned');
  }
  return {
    url: data.publicUrl,
    path,
    bytes: file.size,
    mime: file.type || `image/${ext}`,
  };
}
