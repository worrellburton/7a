'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import SeoSubNav from '../SeoSubNav';

// SEO Media — single inventory of every image + video on the site
// alongside whether SEO metadata (filename / alt / seo_title /
// seo_description) has been written. Two big optimize buttons jump
// to the existing batch runners on /app/images and /app/video, which
// kick off the Claude pass via ?autoRun=1.
//
// Reads site_images + site_videos directly via the browser supabase
// client — same RLS path the dedicated /app/images and /app/video
// pages already use, so there's no new server route to maintain.

interface MediaItem {
  id: string;
  kind: 'image' | 'video';
  filename: string | null;
  alt: string | null;
  seo_title: string | null;
  seo_description: string | null;
  thumb_url: string | null;
  link_url: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  created_at: string;
  processed_at: string | null;
}

function isComplete(m: MediaItem): boolean {
  // "Complete" = has alt + seo_title + seo_description. The kaizen /
  // seo pass writes all three together, so any one being null means
  // the row hasn't been processed.
  return !!(m.alt && m.seo_title && m.seo_description);
}

function formatBytes(n: number | null): string {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(s: number | null): string {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

type Filter = 'all' | 'image' | 'video' | 'missing';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'image', label: 'Images' },
  { id: 'video', label: 'Videos' },
  { id: 'missing', label: 'Missing SEO' },
];

export default function MediaContent() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Two parallel selects — same RLS as the dedicated pages, no
      // new server route needed.
      const [imagesRes, videosRes] = await Promise.all([
        supabase
          .from('site_images')
          .select(
            'id, public_url, filename, alt, seo_title, seo_description, size, width, height, kaizen_processed_at, created_at',
          )
          .order('created_at', { ascending: false }),
        supabase
          .from('site_videos')
          .select(
            'id, video_url, thumbnail_url, filename, alt, seo_title, seo_description, duration_seconds, seo_processed_at, created_at',
          )
          .order('created_at', { ascending: false }),
      ]);
      if (imagesRes.error) throw new Error(imagesRes.error.message);
      if (videosRes.error) throw new Error(videosRes.error.message);

      const imageItems: MediaItem[] = (imagesRes.data ?? []).map((r) => ({
        id: r.id as string,
        kind: 'image',
        filename: (r.filename as string) ?? null,
        alt: (r.alt as string) ?? null,
        seo_title: (r.seo_title as string) ?? null,
        seo_description: (r.seo_description as string) ?? null,
        thumb_url: (r.public_url as string) ?? null,
        link_url: (r.public_url as string) ?? null,
        size: (r.size as number) ?? null,
        width: (r.width as number) ?? null,
        height: (r.height as number) ?? null,
        duration_seconds: null,
        created_at: r.created_at as string,
        processed_at: (r.kaizen_processed_at as string) ?? null,
      }));
      const videoItems: MediaItem[] = (videosRes.data ?? []).map((r) => ({
        id: r.id as string,
        kind: 'video',
        filename: (r.filename as string) ?? null,
        alt: (r.alt as string) ?? null,
        seo_title: (r.seo_title as string) ?? null,
        seo_description: (r.seo_description as string) ?? null,
        thumb_url: (r.thumbnail_url as string) ?? null,
        link_url: (r.video_url as string) ?? null,
        size: null,
        width: null,
        height: null,
        duration_seconds: (r.duration_seconds as number) ?? null,
        created_at: r.created_at as string,
        processed_at: (r.seo_processed_at as string) ?? null,
      }));
      const merged = [...imageItems, ...videoItems].sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      );
      setItems(merged);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    let images = 0;
    let videos = 0;
    let missing = 0;
    for (const m of items) {
      if (m.kind === 'image') images += 1;
      else videos += 1;
      if (!isComplete(m)) missing += 1;
    }
    return { all: items.length, image: images, video: videos, missing };
  }, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((m) => {
      if (filter === 'image' && m.kind !== 'image') return false;
      if (filter === 'video' && m.kind !== 'video') return false;
      if (filter === 'missing' && isComplete(m)) return false;
      if (!q) return true;
      return (
        (m.filename ?? '').toLowerCase().includes(q) ||
        (m.alt ?? '').toLowerCase().includes(q) ||
        (m.seo_title ?? '').toLowerCase().includes(q)
      );
    });
  }, [items, filter, query]);

  return (
    <div className="p-8 max-w-7xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/app/seo"
              className="text-xs font-semibold text-foreground/40 hover:text-primary uppercase tracking-wider inline-flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              SEO
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Media
          </h1>
          <p className="mt-1 text-sm text-foreground/60 max-w-2xl">
            Every image + video on the site, with whether the SEO
            pass has written filename / alt / title / description for
            each. Click an Optimize button to kick off the Claude
            batch runner — it processes everything missing SEO and
            writes the results back.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap gap-2 justify-end">
            <Link
              href="/app/images?autoRun=1"
              className="inline-flex items-center gap-2 rounded-lg bg-foreground text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-foreground/85 transition"
              title="Open the SEO Images batch runner and start optimization automatically."
            >
              <ZoomIcon />
              Optimize images
            </Link>
            <Link
              href="/app/video?autoRun=1"
              className="inline-flex items-center gap-2 rounded-lg bg-foreground text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-foreground/85 transition"
              title="Open the SEO Video batch runner and start optimization automatically."
            >
              <ZoomIcon />
              Optimize videos
            </Link>
          </div>
          <p className="text-[11px] text-foreground/45">
            {counts.missing} of {counts.all} items missing SEO
          </p>
        </div>
      </header>

      <SeoSubNav />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 mb-5">
          <strong>Couldn&apos;t load media:</strong> {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard label="Total" value={counts.all} loading={loading} />
        <SummaryCard label="Images" value={counts.image} loading={loading} />
        <SummaryCard label="Videos" value={counts.video} loading={loading} />
        <SummaryCard label="Missing SEO" value={counts.missing} loading={loading} accent="amber" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
              f.id === filter
                ? 'bg-foreground text-white border-foreground'
                : 'bg-white text-foreground/65 border-black/10 hover:bg-warm-bg/40'
            }`}
          >
            {f.label}
            <span className={`ml-1 ${f.id === filter ? 'text-white/70' : 'text-foreground/40'}`}>
              · {f.id === 'all' ? counts.all : f.id === 'image' ? counts.image : f.id === 'video' ? counts.video : counts.missing}
            </span>
          </button>
        ))}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search media…"
          className="ml-auto text-sm rounded-md border border-black/10 bg-white px-3 py-1.5 w-64 max-w-full"
        />
      </div>

      <div className="overflow-hidden border border-black/10 rounded-xl bg-white">
        <table className="w-full text-sm">
          <thead className="bg-warm-bg/50 text-[11px] uppercase tracking-wider text-foreground/55">
            <tr>
              <th className="text-left px-3 py-2.5 font-semibold border-b border-black/10 w-20">Preview</th>
              <th className="text-left px-3 py-2.5 font-semibold border-b border-black/10">File</th>
              <th className="text-left px-3 py-2.5 font-semibold border-b border-black/10">Alt</th>
              <th className="text-left px-3 py-2.5 font-semibold border-b border-black/10 w-24">Type</th>
              <th className="text-left px-3 py-2.5 font-semibold border-b border-black/10 w-28">SEO</th>
              <th className="text-right px-3 py-2.5 font-semibold border-b border-black/10 w-24">Size</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-foreground/50">
                  Loading…
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-foreground/50">
                  {items.length === 0
                    ? 'No media uploaded yet.'
                    : 'No media matches the current filter.'}
                </td>
              </tr>
            ) : (
              visible.map((m) => (
                <tr key={`${m.kind}-${m.id}`} className="align-top">
                  <td className="px-3 py-3">
                    <Thumb m={m} />
                  </td>
                  <td className="px-3 py-3">
                    {m.link_url ? (
                      <a
                        href={m.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium truncate max-w-[260px] block"
                        title={m.filename || m.link_url}
                      >
                        {m.filename || '(unnamed)'}
                      </a>
                    ) : (
                      <span className="text-foreground/55">{m.filename || '(unnamed)'}</span>
                    )}
                    {m.seo_title ? (
                      <p className="text-[11px] text-foreground/45 truncate max-w-[260px]" title={m.seo_title}>
                        {m.seo_title}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-foreground/70 text-[13px] leading-relaxed">
                    {m.alt ? (
                      <span className="line-clamp-2 max-w-[280px]" title={m.alt}>
                        {m.alt}
                      </span>
                    ) : (
                      <span className="italic text-foreground/40">(no alt)</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border ${
                        m.kind === 'image'
                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : 'bg-violet-50 text-violet-700 border-violet-200'
                      }`}
                    >
                      {m.kind}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {isComplete(m) ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Done
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                        Missing
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right text-foreground/60 tabular-nums text-[12px]">
                    {m.kind === 'image'
                      ? formatBytes(m.size)
                      : formatDuration(m.duration_seconds)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  loading,
  accent,
}: {
  label: string;
  value: number;
  loading: boolean;
  accent?: 'amber';
}) {
  const color = accent === 'amber' ? 'text-amber-600' : 'text-foreground';
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">{label}</p>
      <p className={`text-2xl font-bold tabular-nums mt-1 ${color}`}>
        {loading ? '…' : value.toLocaleString()}
      </p>
    </div>
  );
}

function Thumb({ m }: { m: MediaItem }) {
  if (!m.thumb_url) {
    return (
      <div className="w-14 h-14 rounded-md bg-warm-bg flex items-center justify-center text-foreground/30">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
    );
  }
  return (
    <div className="relative w-14 h-14 rounded-md overflow-hidden bg-warm-bg">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={m.thumb_url}
        alt=""
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {m.kind === 'video' ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/20">
          <svg className="w-4 h-4 text-white drop-shadow" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <polygon points="5 3 19 12 5 21" />
          </svg>
        </span>
      ) : null}
    </div>
  );
}

function ZoomIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}
