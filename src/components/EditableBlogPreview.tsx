'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Layout, LayoutBlock } from '@/lib/content-claude';
import { supabase } from '@/lib/supabase';
import DbBlogRenderer from '@/components/DbBlogRenderer';

// Step-6 preview that lets the editor rewrite any text and swap any
// image without leaving the page. Edit mode is a single toggle at the
// top of the panel:
//
//   - Off: standard DbBlogRenderer (matches the public-site result).
//   - On:  each block becomes a small editable form. Text inputs +
//          textareas back hero / prose / pull_quote / callout / image
//          caption / svg_icon. Image blocks expose a "Swap image"
//          control that opens the picker (existing blog_images +
//          /site_images library).
//
// All edits live in local state until the user presses Save, which
// PATCHes /api/content/<id> with the new layout. Cancel reverts to
// the server snapshot.

interface DbImage {
  id: string;
  url: string;
  alt: string | null;
  prompt: string | null;
  provider: string;
}

interface SiteImage {
  id: string;
  public_url: string;
  filename: string;
  alt: string | null;
}

export default function EditableBlogPreview({
  blogId,
  layout,
  blogImages,
  token,
  onSaved,
}: {
  blogId: string;
  layout: Layout;
  blogImages: DbImage[];
  token: string | null;
  onSaved: (next: Layout) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Layout>(layout);
  const [picker, setPicker] = useState<{ blockIndex: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Keep the draft in sync when the server pushes a new layout
  // (e.g. after a fresh "Build"). If the user is mid-edit we still
  // reset so they don't accidentally save a stale view.
  useEffect(() => { setDraft(layout); }, [layout]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(layout), [draft, layout]);

  function patchBlock(i: number, patch: Partial<LayoutBlock>) {
    setDraft((cur) => ({
      blocks: cur.blocks.map((b, idx) => (idx === i ? ({ ...b, ...patch } as LayoutBlock) : b)),
    }));
  }

  async function save() {
    if (!token) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/content/${blogId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ layout: draft }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json.error ?? `HTTP ${res.status}`);
        return;
      }
      onSaved(draft);
      setEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    setDraft(layout);
    setEditing(false);
    setErr(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-[11px] text-foreground/55">
          {editing
            ? 'Edit any text or image below. Changes save to the published layout when you press Save.'
            : 'Live preview — exactly what the public site will render.'}
        </p>
        <div className="flex items-center gap-2">
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-[11px] font-semibold border border-black/10 rounded-md px-2.5 py-1 text-foreground/70 hover:bg-warm-bg/60"
            >
              ✎ Edit preview
            </button>
          ) : (
            <>
              {dirty && (
                <span className="text-[10.5px] font-semibold text-amber-700 uppercase tracking-wider">Unsaved</span>
              )}
              <button
                type="button"
                onClick={cancel}
                disabled={busy}
                className="text-[11px] font-semibold border border-black/10 rounded-md px-2.5 py-1 text-foreground/70 hover:bg-warm-bg/60 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={busy || !dirty}
                className="text-[11px] font-semibold rounded-md px-2.5 py-1 bg-emerald-600 text-white disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {err && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800 mb-3">
          {err}
        </div>
      )}

      <div className="rounded-lg border border-black/5 overflow-hidden bg-white">
        {editing ? (
          <div className="divide-y divide-black/5">
            {draft.blocks.map((block, i) => (
              <EditableBlock
                key={i}
                index={i}
                block={block}
                onChange={(patch) => patchBlock(i, patch)}
                onSwapImage={() => setPicker({ blockIndex: i })}
              />
            ))}
          </div>
        ) : (
          <DbBlogRenderer layout={draft} />
        )}
      </div>

      {picker && (
        <ImagePickerModal
          blogImages={blogImages}
          onClose={() => setPicker(null)}
          onPick={(url, alt) => {
            const i = picker.blockIndex;
            setDraft((cur) => ({
              blocks: cur.blocks.map((b, idx) => {
                if (idx !== i) return b;
                if (b.type === 'hero') {
                  return { ...b, image: { url, alt: alt || b.image?.alt || '' } };
                }
                if (b.type === 'image') {
                  return { ...b, url, alt: alt || b.alt };
                }
                return b;
              }),
            }));
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}

function EditableBlock({
  index,
  block,
  onChange,
  onSwapImage,
}: {
  index: number;
  block: LayoutBlock;
  onChange: (patch: Partial<LayoutBlock>) => void;
  onSwapImage: () => void;
}) {
  // Tiny tag in the corner of every editable block so the editor can
  // see at a glance what type of block they're working with.
  const typeLabel = block.type.replace('_', ' ');

  return (
    <div className="p-4 relative">
      <span className="absolute top-2 right-3 text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/35">
        #{index + 1} · {typeLabel}
      </span>

      {block.type === 'hero' && (
        <div>
          <ImageSlot url={block.image?.url} alt={block.image?.alt ?? ''} onSwap={onSwapImage} />
          <TextField
            label="Title"
            value={block.title}
            onChange={(v) => onChange({ title: v } as Partial<LayoutBlock>)}
            display
          />
          <TextField
            label="Tagline"
            value={block.tagline ?? ''}
            onChange={(v) => onChange({ tagline: v } as Partial<LayoutBlock>)}
            multiline
          />
          {block.image && (
            <TextField
              label="Image alt"
              value={block.image.alt}
              onChange={(v) => onChange({ image: { url: block.image!.url, alt: v } } as Partial<LayoutBlock>)}
            />
          )}
        </div>
      )}

      {block.type === 'prose' && (
        <div>
          <TextField
            label="Markdown"
            value={block.markdown}
            onChange={(v) => onChange({ markdown: v } as Partial<LayoutBlock>)}
            multiline
            rows={8}
            mono
          />
        </div>
      )}

      {block.type === 'image' && (
        <div>
          <ImageSlot url={block.url} alt={block.alt} onSwap={onSwapImage} />
          <TextField label="Alt text" value={block.alt} onChange={(v) => onChange({ alt: v } as Partial<LayoutBlock>)} />
          <TextField
            label="Caption (optional)"
            value={block.caption ?? ''}
            onChange={(v) => onChange({ caption: v } as Partial<LayoutBlock>)}
          />
        </div>
      )}

      {block.type === 'pull_quote' && (
        <div>
          <TextField
            label="Quote"
            value={block.quote}
            onChange={(v) => onChange({ quote: v } as Partial<LayoutBlock>)}
            multiline
            rows={3}
          />
          <TextField
            label="Attribution"
            value={block.attribution ?? ''}
            onChange={(v) => onChange({ attribution: v } as Partial<LayoutBlock>)}
          />
        </div>
      )}

      {block.type === 'callout' && (
        <div>
          <label className="block mb-2">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-foreground/45 mb-1">Tone</span>
            <select
              value={block.tone}
              onChange={(e) => onChange({ tone: e.target.value as 'info' | 'note' | 'warning' } as Partial<LayoutBlock>)}
              className="rounded-md border border-black/10 px-2 py-1 text-[12px] bg-white"
            >
              <option value="info">Info</option>
              <option value="note">Note</option>
              <option value="warning">Warning</option>
            </select>
          </label>
          <TextField label="Heading" value={block.heading} onChange={(v) => onChange({ heading: v } as Partial<LayoutBlock>)} />
          <TextField
            label="Body"
            value={block.body}
            onChange={(v) => onChange({ body: v } as Partial<LayoutBlock>)}
            multiline
            rows={3}
          />
        </div>
      )}

      {block.type === 'svg_icon' && (
        <div>
          <label className="block mb-2">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-foreground/45 mb-1">Icon</span>
            <select
              value={block.icon}
              onChange={(e) => onChange({ icon: e.target.value as 'compass' | 'leaf' | 'mountain' | 'sun' | 'wave' | 'arrow' } as Partial<LayoutBlock>)}
              className="rounded-md border border-black/10 px-2 py-1 text-[12px] bg-white"
            >
              <option value="compass">Compass</option>
              <option value="leaf">Leaf</option>
              <option value="mountain">Mountain</option>
              <option value="sun">Sun</option>
              <option value="wave">Wave</option>
              <option value="arrow">Arrow</option>
            </select>
          </label>
          <TextField
            label="Heading"
            value={block.heading ?? ''}
            onChange={(v) => onChange({ heading: v } as Partial<LayoutBlock>)}
          />
          <TextField
            label="Body"
            value={block.body ?? ''}
            onChange={(v) => onChange({ body: v } as Partial<LayoutBlock>)}
            multiline
            rows={3}
          />
        </div>
      )}

      {block.type === 'webgl_animation' && (
        <div className="text-[11px] text-foreground/45 italic">
          Animation block — preview-only here. Edit scene / accent in /api/content build phase.
        </div>
      )}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  multiline,
  rows = 2,
  display,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  rows?: number;
  display?: boolean;
  mono?: boolean;
}) {
  const base = `w-full rounded-md border border-black/10 px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30 ${mono ? 'font-mono text-[12px]' : ''} ${display ? 'font-bold text-[15px]' : ''}`;
  return (
    <label className="block mb-2">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-foreground/45 mb-1">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
          className={`${base} leading-relaxed`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      )}
    </label>
  );
}

function ImageSlot({ url, alt, onSwap }: { url?: string; alt?: string; onSwap: () => void }) {
  if (!url) {
    return (
      <button
        type="button"
        onClick={onSwap}
        className="w-full aspect-[16/9] rounded-md border-2 border-dashed border-black/15 bg-warm-bg/40 text-[12px] font-semibold text-foreground/55 hover:bg-warm-bg/60 mb-3"
      >
        + Pick an image
      </button>
    );
  }
  return (
    <div className="relative group mb-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt ?? ''} className="w-full aspect-[16/9] object-cover rounded-md" />
      <button
        type="button"
        onClick={onSwap}
        className="absolute top-2 right-2 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-foreground/85 text-white text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
      >
        Swap image
      </button>
    </div>
  );
}

function ImagePickerModal({
  blogImages,
  onClose,
  onPick,
}: {
  blogImages: DbImage[];
  onClose: () => void;
  onPick: (url: string, alt: string) => void;
}) {
  const [tab, setTab] = useState<'blog' | 'library'>(blogImages.length > 0 ? 'blog' : 'library');
  const [library, setLibrary] = useState<SiteImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('site_images')
        .select('id, public_url, filename, alt')
        .order('created_at', { ascending: false })
        .limit(200);
      if (cancelled) return;
      setLibrary((data ?? []) as SiteImage[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return library;
    return library.filter((i) => `${i.filename} ${i.alt ?? ''}`.toLowerCase().includes(q));
  }, [library, search]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        <header className="px-4 py-3 border-b border-black/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab('blog')}
              className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-md transition-colors ${
                tab === 'blog' ? 'bg-foreground text-white' : 'text-foreground/65 hover:bg-warm-bg/60'
              }`}
            >
              This blog ({blogImages.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('library')}
              className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-md transition-colors ${
                tab === 'library' ? 'bg-foreground text-white' : 'text-foreground/65 hover:bg-warm-bg/60'
              }`}
            >
              Library
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-foreground/55 hover:text-foreground text-lg"
            aria-label="Close picker"
          >
            ✕
          </button>
        </header>
        {tab === 'library' && (
          <div className="px-4 py-2 border-b border-black/5">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search filename or alt…"
              className="w-full rounded-md border border-black/10 px-2.5 py-1.5 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'blog' ? (
            blogImages.length === 0 ? (
              <p className="text-[12px] text-foreground/55 italic">
                No images attached to this blog yet. Use the Library tab to pull one in.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {blogImages.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => onPick(img.url, img.alt ?? '')}
                    className="group relative rounded-lg overflow-hidden border border-black/10 hover:border-primary/60 transition-colors"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.alt ?? ''} className="w-full aspect-[4/3] object-cover" />
                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors" />
                    <p className="absolute bottom-0 inset-x-0 px-2 py-1 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] truncate text-left">
                      {img.alt || img.prompt || img.provider}
                    </p>
                  </button>
                ))}
              </div>
            )
          ) : loading ? (
            <p className="text-[12px] text-foreground/55 italic">Loading library…</p>
          ) : filtered.length === 0 ? (
            <p className="text-[12px] text-foreground/55 italic">No library images match.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => onPick(img.public_url, img.alt ?? '')}
                  className="group relative rounded-lg overflow-hidden border border-black/10 hover:border-primary/60 transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.public_url} alt={img.alt ?? ''} className="w-full aspect-[4/3] object-cover" />
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors" />
                  <p className="absolute bottom-0 inset-x-0 px-2 py-1 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] truncate text-left">
                    {img.alt || img.filename}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
