'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

// Per-directory screenshot uploads. Single shared subscription
// loads every screenshot for the page once and exposes a
// directory_id → ScreenshotRow[] map; per-row drop zones use that
// map to render thumbnails + accept new uploads.

export interface ScreenshotRow {
  id: string;
  directory_id: string;
  public_url: string;
  storage_path: string;
  content_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  uploaded_at: string;
}

export function useDirectoryScreenshots() {
  const { session } = useAuth();
  const [rows, setRows] = useState<ScreenshotRow[]>([]);

  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('seo_directory_screenshots')
        .select('id, directory_id, public_url, storage_path, content_type, size_bytes, uploaded_by, uploaded_by_name, uploaded_at')
        .order('uploaded_at', { ascending: false })
        .limit(500);
      if (cancelled) return;
      setRows((data ?? []) as ScreenshotRow[]);
    })();

    const channel = supabase
      .channel(`seo_directory_screenshots_${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'seo_directory_screenshots' },
        (payload) => {
          const row = payload.new as ScreenshotRow;
          setRows((prev) => (prev.some((r) => r.id === row.id) ? prev : [row, ...prev]));
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'seo_directory_screenshots' },
        (payload) => {
          const row = payload.old as { id: string };
          setRows((prev) => prev.filter((r) => r.id !== row.id));
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [session?.access_token]);

  const byDirectory = useMemo(() => {
    const m = new Map<string, ScreenshotRow[]>();
    for (const r of rows) {
      const list = m.get(r.directory_id) ?? [];
      list.push(r);
      m.set(r.directory_id, list);
    }
    return m;
  }, [rows]);

  return { byDirectory };
}

// Drop-zone wrapper — listens for dragover/drop on its descendant
// area and uploads any image files dropped to /screenshots route
// for that directory. Visual feedback: a copper-glow ring lights
// up on dragover. Multiple files in one drop are uploaded in
// parallel; per-file errors surface as toast text below.

export function DirectoryRowDropZone({
  directoryId,
  children,
}: {
  directoryId: string;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Counter pattern — dragenter/leave fires for every nested child,
  // so naively toggling on enter/leave produces flicker. Track the
  // depth instead and treat hover as "depth > 0".
  const [depth, setDepth] = useState(0);
  useEffect(() => setHover(depth > 0), [depth]);

  const upload = useCallback(
    async (file: File) => {
      setBusy((b) => b + 1);
      setError(null);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`/api/seo/directories/${encodeURIComponent(directoryId)}/screenshots`, {
          method: 'POST',
          body: fd,
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          setError((prev) => prev ?? (json?.error ?? `HTTP ${res.status}`));
        }
      } catch (e) {
        setError((prev) => prev ?? (e instanceof Error ? e.message : 'Upload failed'));
      } finally {
        setBusy((b) => b - 1);
      }
    },
    [directoryId],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDepth(0);
      const files = Array.from(e.dataTransfer.files ?? []).filter((f) =>
        f.type.startsWith('image/'),
      );
      if (files.length === 0) return;
      for (const f of files) void upload(f);
    },
    [upload],
  );

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        // Only react if the drag includes files (not text/elements).
        if (Array.from(e.dataTransfer.types).includes('Files')) {
          setDepth((d) => d + 1);
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDepth((d) => Math.max(0, d - 1));
      }}
      onDrop={onDrop}
      className="relative"
      style={
        hover
          ? {
              boxShadow:
                'inset 0 0 0 2px rgba(188,107,74,0.55), 0 0 0 4px rgba(188,107,74,0.15)',
              borderRadius: 8,
              background: 'rgba(188,107,74,0.04)',
            }
          : undefined
      }
    >
      {children}
      {hover && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          Drop image to attach
        </div>
      )}
      {busy > 0 && (
        <div className="pointer-events-none absolute top-1 right-2 text-[10px] text-primary/85 bg-white/90 rounded px-1.5 py-0.5 shadow">
          Uploading{busy > 1 ? ` ${busy}` : ''}…
        </div>
      )}
      {error && (
        <div className="pointer-events-auto absolute bottom-1 right-2 text-[10px] text-rose-700 bg-rose-50 rounded px-1.5 py-0.5 shadow flex items-center gap-1.5">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss" className="text-rose-500 hover:text-rose-700">×</button>
        </div>
      )}
    </div>
  );
}

// Tiny thumbnail strip — sits inside the directory cell so it
// doesn't need a new column. Click thumb → opens full image in a
// new tab. Hover thumb → reveals a tiny × delete affordance for
// uploader/admin (RLS gates the actual delete server-side).

export function DirectoryScreenshotStrip({
  directoryId,
  rows,
}: {
  directoryId: string;
  rows: ScreenshotRow[];
}) {
  const { user } = useAuth();
  if (!rows || rows.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {rows.map((r) => {
        const canDelete = !!user && (r.uploaded_by === user.id || /* admin handled by API */ true);
        return (
          <div key={r.id} className="group/thumb relative">
            <a
              href={r.public_url}
              target="_blank"
              rel="noopener noreferrer"
              title={`Uploaded ${new Date(r.uploaded_at).toLocaleString()}${r.uploaded_by_name ? ` by ${r.uploaded_by_name}` : ''}`}
              className="block w-10 h-10 rounded overflow-hidden ring-1 ring-black/10 bg-warm-bg/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={r.public_url}
                alt={`Screenshot for ${directoryId}`}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </a>
            {canDelete && (
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!confirm('Delete this screenshot?')) return;
                  await fetch(`/api/seo/directories/${encodeURIComponent(directoryId)}/screenshots/${r.id}`, {
                    method: 'DELETE',
                  });
                }}
                aria-label="Delete screenshot"
                title="Delete screenshot"
                className="absolute -top-1 -right-1 hidden group-hover/thumb:inline-flex items-center justify-center w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold leading-none shadow"
              >
                ×
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
