'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { useModal } from '@/lib/ModalProvider';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/upload';
import { logActivity } from '@/lib/activity';

interface SiteImage {
  id: string;
  path: string;
  public_url: string;
  filename: string;
  mime: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  alt: string | null;
  uploaded_by: string | null;
  created_at: string;
  // Optional columns — only present after 20260422_site_images_kaizen.sql
  // is applied. Defensive `?` so the page still renders without them.
  rating?: number | null;
  seo_title?: string | null;
  seo_description?: string | null;
  kaizen_processed_at?: string | null;
  original_filename?: string | null;
}

interface KaizenProgress {
  imageId: string;
  step: 'analyzing' | 'recompressing' | 'uploading' | 'updating' | 'done' | 'error';
  error?: string;
}

const BUCKET = 'public-images';
// Files for this gallery live under /site-gallery/ inside the bucket so we
// don't conflict with anything else that might already be in there.
const FOLDER = 'site-gallery';

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function dimensionsOf(file: File): Promise<{ width: number | null; height: number | null }> {
  if (!file.type.startsWith('image/')) {
    return Promise.resolve({ width: null, height: null });
  }
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: null, height: null });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

interface UploadProgress {
  id: string;
  filename: string;
  status: 'uploading' | 'error';
  error?: string;
}

export default function ImagesContent() {
  const { user, session } = useAuth();
  const { confirm } = useModal();
  const [images, setImages] = useState<SiteImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [preview, setPreview] = useState<SiteImage | null>(null);
  const [kaizenRunning, setKaizenRunning] = useState(false);
  const [kaizenAbort, setKaizenAbort] = useState(false);
  const [kaizenProgress, setKaizenProgress] = useState<KaizenProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const loadImages = useCallback(async () => {
    const { data, error } = await supabase
      .from('site_images')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[images] load failed', error);
      setLoading(false);
      return;
    }
    setImages((data || []) as SiteImage[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!session?.access_token) return;
    loadImages();
  }, [session, loadImages]);

  // Esc closes preview lightbox.
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreview(null);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [preview]);

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied to clipboard');
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        showToast('Link copied to clipboard');
      } catch {
        showToast('Could not copy — select the URL manually');
      }
      document.body.removeChild(ta);
    }
  }

  async function uploadOne(file: File) {
    if (!user) return;
    if (!file.type.startsWith('image/')) {
      showToast(`${file.name} is not an image`);
      return;
    }
    const tmpId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setUploads((prev) => [...prev, { id: tmpId, filename: file.name, status: 'uploading' }]);

    try {
      const prepared = await compressImage(file, { maxEdge: 2400, targetBytes: 4 * 1024 * 1024 });
      const dims = await dimensionsOf(prepared);
      const ext = (prepared.name.split('.').pop() || 'jpg').toLowerCase();
      const safeBase = prepared.name
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-z0-9-_]+/gi, '-')
        .toLowerCase()
        .slice(0, 60) || 'image';
      const path = `${FOLDER}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeBase}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, prepared, {
          contentType: prepared.type || 'image/jpeg',
          cacheControl: '31536000',
          upsert: false,
        });

      if (upErr) {
        setUploads((prev) => prev.map((u) => (u.id === tmpId ? { ...u, status: 'error', error: upErr.message } : u)));
        return;
      }

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) {
        setUploads((prev) => prev.map((u) => (u.id === tmpId ? { ...u, status: 'error', error: 'No URL returned' } : u)));
        return;
      }

      const { data: row, error: insErr } = await supabase
        .from('site_images')
        .insert({
          path,
          public_url: publicUrl,
          filename: file.name,
          mime: prepared.type || file.type || null,
          size: prepared.size,
          width: dims.width,
          height: dims.height,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (insErr) {
        // Storage upload succeeded but the metadata insert failed — surface
        // the error so we don't end up with orphan files looking like a
        // mysterious "ghost" upload.
        setUploads((prev) => prev.map((u) => (u.id === tmpId ? { ...u, status: 'error', error: insErr.message } : u)));
        return;
      }

      setImages((prev) => [row as SiteImage, ...prev]);
      setUploads((prev) => prev.filter((u) => u.id !== tmpId));
      logActivity({
        userId: user.id,
        type: 'doc.uploaded',
        targetKind: 'file',
        targetLabel: file.name,
        targetPath: '/app/images',
        metadata: { bucket: BUCKET, size: prepared.size, mime: prepared.type, url: publicUrl },
      });
    } catch (err) {
      setUploads((prev) =>
        prev.map((u) => (u.id === tmpId ? { ...u, status: 'error', error: String(err) } : u)),
      );
    }
  }

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    // Upload in parallel — the browser caps concurrent connections per
    // origin so this is fine for typical batch sizes.
    await Promise.all(arr.map(uploadOne));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  async function deleteImage(img: SiteImage) {
    const ok = await confirm(`Delete ${img.filename}?`, {
      message: 'This removes the file from storage and the gallery. Anything on the public site that links to this URL will break.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;

    const { error: storageErr } = await supabase.storage.from(BUCKET).remove([img.path]);
    if (storageErr) {
      showToast(`Storage delete failed: ${storageErr.message}`);
      // Continue to row delete anyway — better to clear the metadata than
      // leave a phantom card pointing at a 404.
    }
    const { error: dbErr } = await supabase.from('site_images').delete().eq('id', img.id);
    if (dbErr) {
      showToast(`Delete failed: ${dbErr.message}`);
      return;
    }
    setImages((prev) => prev.filter((i) => i.id !== img.id));
    showToast('Image removed');
  }

  async function updateAlt(img: SiteImage, alt: string) {
    const { error } = await supabase
      .from('site_images')
      .update({ alt: alt || null })
      .eq('id', img.id);
    if (error) {
      showToast(`Alt save failed: ${error.message}`);
      return;
    }
    setImages((prev) => prev.map((i) => (i.id === img.id ? { ...i, alt: alt || null } : i)));
  }

  async function updateRating(img: SiteImage, rating: number) {
    const clamped = Math.max(0, Math.min(5, Math.round(rating)));
    // Optimistic — assumes the rating column exists. If the migration
    // hasn't run yet we surface the Postgres error in a toast so it's
    // obvious what's missing.
    setImages((prev) => prev.map((i) => (i.id === img.id ? { ...i, rating: clamped } : i)));
    const { error } = await supabase
      .from('site_images')
      .update({ rating: clamped })
      .eq('id', img.id);
    if (error) {
      setImages((prev) => prev.map((i) => (i.id === img.id ? { ...i, rating: img.rating ?? 0 } : i)));
      showToast(`Rating failed: ${error.message} — has the kaizen migration been applied?`);
    }
  }

  async function kaizenOne(img: SiteImage): Promise<'ok' | 'error'> {
    if (!user || !session?.access_token) return 'error';

    setKaizenProgress({ imageId: img.id, step: 'analyzing' });
    let suggestion: { filename: string; alt: string; seo_title: string; seo_description: string } | null = null;
    try {
      const res = await fetch('/api/claude/images/kaizen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          imageUrl: img.public_url,
          currentFilename: img.filename,
          currentAlt: img.alt,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setKaizenProgress({ imageId: img.id, step: 'error', error: json?.error || `API ${res.status}` });
        return 'error';
      }
      suggestion = json;
    } catch (err) {
      setKaizenProgress({ imageId: img.id, step: 'error', error: String(err) });
      return 'error';
    }
    if (!suggestion) return 'error';

    // Download the existing file, recompress it for web delivery, and
    // re-upload under the new descriptive filename.
    setKaizenProgress({ imageId: img.id, step: 'recompressing' });
    let newFile: File;
    try {
      const blobRes = await fetch(img.public_url);
      if (!blobRes.ok) throw new Error(`source fetch ${blobRes.status}`);
      const blob = await blobRes.blob();
      const srcFile = new File([blob], `${suggestion.filename}.jpg`, { type: blob.type || 'image/jpeg' });
      newFile = await compressImage(srcFile, { maxEdge: 1920, targetBytes: 600 * 1024 });
    } catch (err) {
      setKaizenProgress({ imageId: img.id, step: 'error', error: `Recompress: ${String(err)}` });
      return 'error';
    }

    setKaizenProgress({ imageId: img.id, step: 'uploading' });
    const ext = (newFile.name.split('.').pop() || 'jpg').toLowerCase();
    const newPath = `${FOLDER}/${Date.now()}-${Math.random().toString(36).slice(2)}-${suggestion.filename}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(newPath, newFile, {
      contentType: newFile.type || 'image/jpeg',
      cacheControl: '31536000',
      upsert: false,
    });
    if (upErr) {
      setKaizenProgress({ imageId: img.id, step: 'error', error: `Upload: ${upErr.message}` });
      return 'error';
    }
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(newPath);
    const newUrl = urlData?.publicUrl;
    if (!newUrl) {
      setKaizenProgress({ imageId: img.id, step: 'error', error: 'No URL from storage' });
      return 'error';
    }

    // Detect natural dimensions of the recompressed file so the grid
    // shows the new size after Kaizen instead of the stale pre-resize
    // numbers.
    let width: number | null = img.width;
    let height: number | null = img.height;
    try {
      const dims = await dimensionsOf(newFile);
      if (dims.width && dims.height) {
        width = dims.width;
        height = dims.height;
      }
    } catch {
      // non-fatal
    }

    setKaizenProgress({ imageId: img.id, step: 'updating' });
    const nextFilename = `${suggestion.filename}.${ext}`;
    const { data: updated, error: dbErr } = await supabase
      .from('site_images')
      .update({
        path: newPath,
        public_url: newUrl,
        filename: nextFilename,
        alt: suggestion.alt,
        seo_title: suggestion.seo_title,
        seo_description: suggestion.seo_description,
        size: newFile.size,
        width,
        height,
        mime: newFile.type || 'image/jpeg',
        original_filename: img.original_filename || img.filename,
        kaizen_processed_at: new Date().toISOString(),
      })
      .eq('id', img.id)
      .select()
      .single();
    if (dbErr || !updated) {
      // Metadata write failed — delete the new orphan file so storage
      // doesn't accumulate phantom uploads.
      await supabase.storage.from(BUCKET).remove([newPath]).catch(() => null);
      setKaizenProgress({ imageId: img.id, step: 'error', error: `DB: ${dbErr?.message || 'unknown'}` });
      return 'error';
    }

    // Remove the old file only after the DB row has the new path.
    await supabase.storage.from(BUCKET).remove([img.path]).catch(() => null);

    setImages((prev) => prev.map((i) => (i.id === img.id ? (updated as SiteImage) : i)));
    setKaizenProgress({ imageId: img.id, step: 'done' });
    return 'ok';
  }

  async function runKaizenBatch(targetIds?: string[]) {
    if (kaizenRunning) return;
    const targets = images.filter((i) =>
      targetIds ? targetIds.includes(i.id) : !i.kaizen_processed_at,
    );
    if (targets.length === 0) {
      showToast('All images already optimized. Select one to re-run.');
      return;
    }
    setKaizenRunning(true);
    setKaizenAbort(false);
    let ok = 0;
    let failed = 0;
    for (const img of targets) {
      if (kaizenAbort) break;
      const result = await kaizenOne(img);
      if (result === 'ok') ok += 1;
      else failed += 1;
    }
    setKaizenRunning(false);
    setKaizenProgress(null);
    showToast(
      failed === 0
        ? `Kaizen complete — optimized ${ok} image${ok === 1 ? '' : 's'}.`
        : `Kaizen finished with ${ok} ok, ${failed} failed. See console for details.`,
    );
  }

  if (!user) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight mb-1">Images</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            Drag & drop images to add them to the marketing gallery. Click any image to copy its URL — paste it into a page or component to use it on the site.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => (kaizenRunning ? setKaizenAbort(true) : runKaizenBatch())}
            disabled={images.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-foreground text-white hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all"
            style={{ fontFamily: 'var(--font-body)' }}
            title="Rename to SEO-friendly filenames, resize for web, and regenerate alt + meta using Claude vision."
          >
            {kaizenRunning ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {kaizenAbort ? 'Stopping…' : 'Stop Kaizen'}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Kaizen Images
              </>
            )}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-primary text-white hover:bg-primary-dark shadow-sm hover:shadow-md transition-all"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload images
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!dragOver) setDragOver(true);
        }}
        onDragLeave={(e) => {
          // Only clear when actually leaving the zone, not just a child element
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragOver(false);
        }}
        onDrop={onDrop}
        className={`mb-6 rounded-2xl border-2 border-dashed transition-colors px-6 py-10 text-center ${
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-gray-200 bg-white hover:border-primary/40'
        }`}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-1">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-foreground" style={{ fontFamily: 'var(--font-body)' }}>
            {dragOver ? 'Drop to upload' : 'Drag & drop images here'}
          </p>
          <p className="text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            or click <button type="button" onClick={() => fileInputRef.current?.click()} className="text-primary font-semibold hover:underline">browse</button> — JPG, PNG, GIF, WebP, etc. Large files are auto-compressed.
          </p>
        </div>
      </div>

      {/* In-flight uploads */}
      {uploads.length > 0 && (
        <div className="mb-6 space-y-2">
          {uploads.map((u) => (
            <div
              key={u.id}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${
                u.status === 'error'
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-100 bg-white'
              }`}
            >
              {u.status === 'uploading' ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M5.07 19h13.86a2 2 0 0 0 1.74-3l-6.93-12a2 2 0 0 0-3.48 0l-6.93 12a2 2 0 0 0 1.74 3z" />
                </svg>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate" style={{ fontFamily: 'var(--font-body)' }}>
                  {u.filename}
                </p>
                {u.error && (
                  <p className="text-xs text-red-600 truncate" style={{ fontFamily: 'var(--font-body)' }}>
                    {u.error}
                  </p>
                )}
              </div>
              {u.status === 'error' && (
                <button
                  onClick={() => setUploads((prev) => prev.filter((x) => x.id !== u.id))}
                  className="text-xs text-foreground/50 hover:text-foreground"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Dismiss
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Gallery grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
            No images yet. Drop your first one above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {images.map((img) => (
            <div key={img.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
              <button
                type="button"
                onClick={() => copyUrl(img.public_url)}
                className="relative aspect-square w-full block bg-warm-bg overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                title="Click to copy URL"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.public_url}
                  alt={img.alt || img.filename}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-foreground text-xs font-semibold shadow" style={{ fontFamily: 'var(--font-body)' }}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy URL
                  </span>
                </div>
              </button>
              <div className="p-3">
                <input
                  defaultValue={img.alt || ''}
                  placeholder="Alt text…"
                  onBlur={(e) => {
                    if ((e.target.value || '') !== (img.alt || '')) {
                      updateAlt(img, e.target.value);
                    }
                  }}
                  className="w-full text-xs px-2 py-1 rounded-md bg-warm-bg/50 border border-transparent focus:bg-white focus:border-gray-200 focus:outline-none mb-1.5"
                  style={{ fontFamily: 'var(--font-body)' }}
                />
                <div className="flex items-center gap-0.5 mb-1" role="radiogroup" aria-label={`Rating for ${img.filename}`}>
                  {[1, 2, 3, 4, 5].map((n) => {
                    const rating = img.rating ?? 0;
                    const active = n <= rating;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => updateRating(img, rating === n ? n - 1 : n)}
                        className={`p-0.5 rounded transition-colors ${active ? 'text-amber-400 hover:text-amber-500' : 'text-foreground/20 hover:text-amber-400'}`}
                        title={`${n} star${n === 1 ? '' : 's'}`}
                        aria-label={`${n} star${n === 1 ? '' : 's'}`}
                        aria-pressed={active}
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26" />
                        </svg>
                      </button>
                    );
                  })}
                  {img.kaizen_processed_at && (
                    <span
                      className="ml-1 inline-flex items-center gap-0.5 text-[9px] text-emerald-600 font-semibold uppercase tracking-wider"
                      style={{ fontFamily: 'var(--font-body)' }}
                      title={`Optimized ${new Date(img.kaizen_processed_at).toLocaleString()}`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Kaizen
                    </span>
                  )}
                </div>
                <p
                  className="text-[11px] text-foreground/40 truncate"
                  style={{ fontFamily: 'var(--font-body)' }}
                  title={img.filename}
                >
                  {img.filename}
                </p>
                {kaizenProgress?.imageId === img.id && kaizenProgress.step !== 'done' && (
                  <p
                    className={`text-[10px] mt-0.5 truncate ${kaizenProgress.step === 'error' ? 'text-red-500' : 'text-primary'}`}
                    style={{ fontFamily: 'var(--font-body)' }}
                    title={kaizenProgress.error}
                  >
                    {kaizenProgress.step === 'error'
                      ? `Error: ${kaizenProgress.error}`
                      : `Kaizen: ${kaizenProgress.step}…`}
                  </p>
                )}
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] text-foreground/30" style={{ fontFamily: 'var(--font-body)' }}>
                    {img.width && img.height ? `${img.width}×${img.height}` : ''}
                    {img.width && img.height && img.size ? ' · ' : ''}
                    {formatBytes(img.size)}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => runKaizenBatch([img.id])}
                      disabled={kaizenRunning}
                      className="p-1.5 rounded-md text-foreground/40 hover:text-primary hover:bg-primary/5 transition-colors disabled:opacity-40"
                      title="Kaizen this image"
                      aria-label="Kaizen this image"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreview(img)}
                      className="p-1.5 rounded-md text-foreground/40 hover:text-foreground hover:bg-warm-bg transition-colors"
                      title="Preview"
                      aria-label="Preview"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteImage(img)}
                      className="p-1.5 rounded-md text-foreground/40 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Delete"
                      aria-label="Delete"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview lightbox */}
      {preview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setPreview(null)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="relative max-w-5xl max-h-[90vh] w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="relative bg-warm-bg flex items-center justify-center" style={{ minHeight: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.public_url} alt={preview.alt || preview.filename} className="max-h-[70vh] w-auto mx-auto object-contain" />
            </div>
            <div className="p-4 flex items-center gap-3 border-t border-gray-100 flex-wrap">
              <input
                readOnly
                value={preview.public_url}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-[200px] text-sm px-3 py-2 rounded-lg bg-warm-bg/50 border border-gray-100 font-mono text-foreground/70"
              />
              <button
                onClick={() => copyUrl(preview.public_url)}
                className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Copy URL
              </button>
              <button
                onClick={() => setPreview(null)}
                className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-foreground/60 text-sm font-semibold hover:bg-warm-bg transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-[fadeSlideUp_0.3s_ease-out]">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-white text-sm font-medium shadow-xl">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
