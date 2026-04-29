'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Picker that lets the Social Media composer select image and video
// assets that already live in the 7A app — public.site_images +
// public.site_videos — instead of pasting public URLs by hand.
//
// Phase 7 ships images only; phase 8 layers videos in alongside.
// Phase 9 replaces the legacy "Image / video URLs" textarea in the
// composer with this picker entirely.

export interface PickedMedia {
  /** The URL Ayrshare receives (image public_url or video_url). */
  url: string;
  /** Thumbnail URL — same as `url` for images, the video's poster
   *  for videos. Used to render the selected-row chips below the
   *  open/close button when the picker isn't expanded. */
  thumbUrl: string;
  /** Display name (filename / alt) for tooltips + a11y. */
  label: string;
  kind: 'image' | 'video';
}

interface SiteImageRow {
  id: string;
  public_url: string;
  filename: string | null;
  alt: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
}

export function MediaPicker({
  value, onChange,
}: {
  value: PickedMedia[];
  onChange: (next: PickedMedia[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<SiteImageRow[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  // Lazy-load on first open so the picker doesn't burn an unneeded
  // SELECT for users who never expand it.
  const ensureLoaded = useCallback(async () => {
    if (images.length > 0 || imagesLoading) return;
    setImagesLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('site_images')
        .select('id, public_url, filename, alt, width, height, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (err) throw err;
      setImages((data ?? []) as SiteImageRow[]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setImagesLoading(false);
    }
  }, [images.length, imagesLoading]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    void ensureLoaded();
  }, [ensureLoaded]);

  const filteredImages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return images;
    return images.filter((i) =>
      (i.filename || '').toLowerCase().includes(q) ||
      (i.alt || '').toLowerCase().includes(q),
    );
  }, [images, query]);

  const selectedUrls = useMemo(() => new Set(value.map((v) => v.url)), [value]);

  const toggleImage = (img: SiteImageRow) => {
    const next = [...value];
    const idx = next.findIndex((v) => v.url === img.public_url);
    if (idx >= 0) {
      next.splice(idx, 1);
    } else {
      next.push({
        url: img.public_url,
        thumbUrl: img.public_url,
        label: img.alt || img.filename || 'Image',
        kind: 'image',
      });
    }
    onChange(next);
  };

  const removeOne = (url: string) => {
    onChange(value.filter((v) => v.url !== url));
  };

  return (
    <div>
      {/* Header: label + summary + toggle button. */}
      <div className="flex items-baseline justify-between mb-2 gap-3 flex-wrap">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground/55">
          Media
        </label>
        <div className="flex items-center gap-3 text-[11px] text-foreground/55">
          <span>
            <span className="font-semibold text-foreground/80">{value.length}</span>
            {' '}selected
          </span>
          <button
            type="button"
            onClick={() => (open ? setOpen(false) : handleOpen())}
            className="text-primary font-semibold hover:underline"
          >
            {open ? 'Close picker' : 'Add from library'}
          </button>
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-foreground/55 font-semibold hover:text-foreground hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Selected-row chips — visible whether the picker is open or
          closed so the admin always sees what's attached. */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {value.map((m) => (
            <SelectedChip key={m.url} media={m} onRemove={() => removeOne(m.url)} />
          ))}
        </div>
      )}

      {open && (
        <div className="rounded-xl border border-black/10 bg-warm-bg/30 p-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by filename or alt text…"
            className="w-full rounded-md border border-black/10 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 mb-3"
          />

          {error && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800 mb-3">
              {error}
            </p>
          )}

          {imagesLoading && images.length === 0 && (
            <p className="text-[11px] text-foreground/45 italic">Loading images…</p>
          )}

          {!imagesLoading && filteredImages.length === 0 && (
            <p className="text-[11px] text-foreground/45 italic">
              {query ? 'No matches.' : 'No images in the library yet.'}
            </p>
          )}

          {filteredImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {filteredImages.map((img) => {
                const checked = selectedUrls.has(img.public_url);
                return (
                  <button
                    type="button"
                    key={img.id}
                    onClick={() => toggleImage(img)}
                    className={`group relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                      checked ? 'border-primary' : 'border-transparent hover:border-primary/40'
                    }`}
                    title={img.alt || img.filename || 'Image'}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.public_url}
                      alt={img.alt || img.filename || ''}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    {/* Selected overlay — primary tint + check. */}
                    {checked && (
                      <span className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SelectedChip({ media, onRemove }: { media: PickedMedia; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 pl-1 pr-2 py-0.5 text-[11px] text-foreground/85">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={media.thumbUrl}
        alt=""
        className="w-5 h-5 rounded-full object-cover ring-1 ring-primary/20"
        loading="lazy"
      />
      <span className="max-w-[140px] truncate" title={media.label}>{media.label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${media.label}`}
        className="ml-1 text-foreground/45 hover:text-red-600"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}
