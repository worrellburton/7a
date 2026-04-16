'use client';

import { useEffect, useRef, useState } from 'react';

// Interactive square/circle crop modal. Takes a File, lets the user pan + zoom
// inside a fixed-size crop box, and returns a cropped JPEG File via onSave.
// No external dependencies — uses CSS transforms for the live preview and
// canvas for the final render.

interface ImageCropModalProps {
  file: File;
  outputSize?: number; // final square pixel size, default 640
  onSave: (cropped: File) => void | Promise<void>;
  onCancel: () => void;
  title?: string;
}

const CROP_BOX = 300; // on-screen crop window in px

export function ImageCropModal({
  file,
  outputSize = 640,
  onSave,
  onCancel,
  title = 'Crop photo',
}: ImageCropModalProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const draggingRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  // baseScale: smallest scale at which the image still covers the crop box.
  const baseScale = natural.w && natural.h ? CROP_BOX / Math.min(natural.w, natural.h) : 1;
  const displayScale = baseScale * zoom;
  const displayW = natural.w * displayScale;
  const displayH = natural.h * displayScale;

  // Clamp so the image always covers the crop box — users can't drag past
  // the edges and expose transparent pixels.
  const maxX = Math.max(0, (displayW - CROP_BOX) / 2);
  const maxY = Math.max(0, (displayH - CROP_BOX) / 2);
  const clampedX = Math.max(-maxX, Math.min(maxX, offset.x));
  const clampedY = Math.max(-maxY, Math.min(maxY, offset.y));

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    draggingRef.current = { startX: e.clientX, startY: e.clientY, ox: clampedX, oy: clampedY };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = draggingRef.current;
    if (!d) return;
    setOffset({ x: d.ox + (e.clientX - d.startX), y: d.oy + (e.clientY - d.startY) });
  };
  const onPointerUp = () => { draggingRef.current = null; };

  async function handleSave() {
    if (!natural.w || !natural.h) return;
    setSaving(true);
    try {
      // Convert crop-box region to source-image coordinates.
      const natCrop = CROP_BOX / displayScale;
      const natCenterX = natural.w / 2 - clampedX / displayScale;
      const natCenterY = natural.h / 2 - clampedY / displayScale;
      const sx = Math.max(0, natCenterX - natCrop / 2);
      const sy = Math.max(0, natCenterY - natCrop / 2);
      const sSize = Math.min(natCrop, natural.w - sx, natural.h - sy);

      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No 2D context');
      const bitmap = await createImageBitmap(file);
      ctx.drawImage(bitmap, sx, sy, sSize, sSize, 0, 0, outputSize, outputSize);
      bitmap.close?.();
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, 'image/jpeg', 0.9)
      );
      if (!blob) throw new Error('Crop failed');
      const base = file.name.replace(/\.[^.]+$/, '') || 'photo';
      const cropped = new File([blob], `${base}-cropped.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
      await onSave(cropped);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black/70 flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <button
            onClick={onCancel}
            className="text-foreground/40 hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div
          className="relative mx-auto bg-warm-bg rounded-xl overflow-hidden touch-none select-none"
          style={{ width: CROP_BOX, height: CROP_BOX }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt=""
              draggable={false}
              onLoad={(e) => {
                const img = e.currentTarget;
                setNatural({ w: img.naturalWidth, h: img.naturalHeight });
                setOffset({ x: 0, y: 0 });
                setZoom(1);
              }}
              className="absolute left-1/2 top-1/2 pointer-events-none"
              style={{
                width: displayW || 'auto',
                height: displayH || 'auto',
                transform: `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`,
              }}
            />
          )}
          {/* Circular mask overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: `0 0 0 9999px rgba(255,255,255,0.55)`,
              borderRadius: '50%',
            }}
          />
          <div className="absolute inset-0 rounded-full border-2 border-white/90 pointer-events-none" />
        </div>

        <div className="mt-4">
          <label className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Zoom</label>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSave}
            disabled={saving || !natural.w}
            className="flex-1 px-4 py-2 rounded-xl bg-foreground text-white text-sm font-medium hover:bg-foreground/80 transition-colors disabled:opacity-50"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-medium text-foreground/60 hover:bg-warm-bg transition-colors disabled:opacity-50"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
