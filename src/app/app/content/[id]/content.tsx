'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthProvider';
import DbBlogRenderer from '@/components/DbBlogRenderer';
import type { Layout } from '@/lib/content-claude';

// One screen, six panels stacked vertically. Each panel light-greys
// itself out until the prior step has run, so the user moves through
// the pipeline in order without picking up surprise UI:
//
//   1. Prompt        (always visible — shows what was typed at create)
//   2. Generate      (button → runs phase 4, fills the body)
//   3. Review/revise (markdown preview + Claude revision input)
//   4. Images        (10 generated, user picks 7)
//   5. Build         (assemble layout JSON — phase 8)
//   6. Publish       (flip live — phase 10)

interface DbBlog {
  id: string;
  slug: string;
  title: string | null;
  status: 'draft' | 'reviewing' | 'images' | 'selecting' | 'built' | 'published';
  prompt: string | null;
  body_markdown: string | null;
  layout: Layout | null;
  selected_image_ids: string[] | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}
interface DbImage {
  id: string;
  blog_id: string;
  provider: string;
  url: string;
  prompt: string | null;
  alt: string | null;
  position: number | null;
}
interface DbRevision {
  id: string;
  user_prompt: string | null;
  body_markdown: string;
  created_at: string;
}

export default function BlogEditor({ id }: { id: string }) {
  const { user, isSuperAdmin, session } = useAuth();
  const [blog, setBlog] = useState<DbBlog | null>(null);
  const [images, setImages] = useState<DbImage[]>([]);
  const [revisions, setRevisions] = useState<DbRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/content/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setBlog(json.blog);
      setImages(json.images ?? []);
      setRevisions(json.revisions ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, id]);

  useEffect(() => { void load(); }, [load]);

  if (!user) return null;
  if (!isSuperAdmin) {
    return <div className="px-4 py-10 text-center text-foreground/55">Super-admin only.</div>;
  }
  if (loading && !blog) return <div className="px-4 py-10 text-center text-foreground/55">Loading…</div>;
  if (!blog) return <div className="px-4 py-10 text-center text-foreground/55">{error ?? 'Not found.'}</div>;

  const token = session?.access_token ?? null;
  const reachedReview = !!blog.body_markdown;
  const reachedSelect = blog.status === 'selecting' || blog.status === 'built' || blog.status === 'published';
  const reachedBuild = blog.status === 'built' || blog.status === 'published';
  const reachedPublish = blog.status === 'published';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ fontFamily: 'var(--font-body)' }}>
      <div className="mb-3">
        <Link href="/app/content" className="text-[11.5px] text-foreground/55 hover:text-foreground">&larr; All content</Link>
      </div>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-1">Blog</p>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          {blog.title || '(Untitled)'}
        </h1>
        <p className="mt-1 text-[12px] text-foreground/50 font-mono">slug: {blog.slug} · status: {blog.status}</p>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800">{error}</div>
      )}

      <PromptPanel prompt={blog.prompt ?? ''} />

      <GeneratePanel
        blog={blog}
        token={token}
        onComplete={() => void load()}
      />

      {reachedReview && (
        <ReviewPanel
          blog={blog}
          token={token}
          revisions={revisions}
          onChange={() => void load()}
        />
      )}

      {reachedReview && (
        <ImagesPanel
          blog={blog}
          images={images}
          token={token}
          onChange={() => void load()}
        />
      )}

      {reachedSelect && images.length > 0 && (
        <BuildPanel
          blog={blog}
          images={images}
          token={token}
          onChange={() => void load()}
        />
      )}

      {reachedBuild && blog.layout && (
        <PreviewPanel layout={blog.layout} />
      )}

      {reachedBuild && (
        <PublishPanel blog={blog} token={token} onChange={() => void load()} />
      )}
      {reachedPublish && (
        <p className="mt-4 text-[12px] text-foreground/55">
          Live at <Link href={`/who-we-are/blog/${blog.slug}`} target="_blank" className="text-primary underline">/who-we-are/blog/{blog.slug}</Link>
        </p>
      )}
    </div>
  );
}

function Panel({ heading, step, children }: { heading: string; step: number; children: React.ReactNode }) {
  return (
    <section className="mb-5 rounded-2xl border border-black/10 bg-white p-5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-foreground/45 font-bold mb-1">Step {step}</p>
      <h2 className="text-lg font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-display)' }}>{heading}</h2>
      {children}
    </section>
  );
}

function PromptPanel({ prompt }: { prompt: string }) {
  return (
    <Panel heading="Prompt" step={1}>
      <p className="text-[13.5px] text-foreground/80 leading-relaxed whitespace-pre-wrap">{prompt || '(no prompt saved)'}</p>
    </Panel>
  );
}

function GeneratePanel({ blog, token, onComplete }: { blog: DbBlog; token: string | null; onComplete: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function go() {
    if (!token) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/content/${blog.id}/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      onComplete();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel heading="Generate body" step={2}>
      <p className="text-[12.5px] text-foreground/65 mb-3 leading-relaxed">
        Runs Claude (opus 4.7) against the prompt to draft a full SEO/GEO-friendly investigative post for sevenarrowsrecoveryarizona.com.
        {blog.body_markdown ? ' A body is already saved — re-running replaces it.' : ''}
      </p>
      {err && <p className="mb-2 text-[12px] text-rose-700">{err}</p>}
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="px-3 py-1.5 rounded-md bg-foreground text-white text-[11.5px] font-semibold disabled:opacity-50"
      >
        {busy ? 'Generating…' : blog.body_markdown ? 'Regenerate body' : 'Generate blog'}
      </button>
    </Panel>
  );
}

function ReviewPanel({ blog, token, revisions, onChange }: { blog: DbBlog; token: string | null; revisions: DbRevision[]; onChange: () => void }) {
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function revise() {
    if (!token || !instruction.trim()) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/content/${blog.id}/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ instruction: instruction.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setInstruction('');
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!token) return;
    setBusy(true); setErr(null);
    try {
      // Approve = kick off image generation.
      const res = await fetch(`/api/content/${blog.id}/images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel heading="Review &amp; revise" step={3}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div className="rounded-lg border border-black/5 bg-warm-bg/30 p-3 max-h-[480px] overflow-y-auto">
          <pre className="whitespace-pre-wrap text-[12.5px] leading-relaxed font-mono text-foreground/85">{blog.body_markdown ?? '(no body yet)'}</pre>
        </div>
        <div>
          <label className="block mb-2">
            <span className="block text-[11px] font-semibold text-foreground/65 mb-1">Ask Claude to revise</span>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={4}
              placeholder="e.g. punchier opener · add a section on insurance · tighten the polyvagal language"
              className="w-full rounded-md border border-black/10 px-2.5 py-2 text-[12.5px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          {err && <p className="mb-2 text-[12px] text-rose-700">{err}</p>}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={revise}
              disabled={busy || !instruction.trim()}
              className="px-3 py-1.5 rounded-md bg-foreground text-white text-[11.5px] font-semibold disabled:opacity-50"
            >
              {busy ? 'Revising…' : 'Revise'}
            </button>
            <button
              type="button"
              onClick={approve}
              disabled={busy}
              className="px-3 py-1.5 rounded-md bg-primary text-white text-[11.5px] font-semibold disabled:opacity-50"
            >
              Approve &amp; generate 10 images
            </button>
          </div>
          {revisions.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-foreground/45 font-bold mb-1">Revision history</p>
              <ul className="space-y-1 text-[11px] text-foreground/65">
                {revisions.slice(0, 8).map((r) => (
                  <li key={r.id}>
                    <span className="text-foreground/45">{new Date(r.created_at).toLocaleString()}</span> — {r.user_prompt ?? 'initial generation'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

function ImagesPanel({ blog, images, token, onChange }: { blog: DbBlog; images: DbImage[]; token: string | null; onChange: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(blog.selected_image_ids ?? []));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setSelected(new Set(blog.selected_image_ids ?? []));
  }, [blog.selected_image_ids]);

  function toggle(imgId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(imgId)) next.delete(imgId);
      else if (next.size < 7) next.add(imgId);
      return next;
    });
  }

  async function saveSelection() {
    if (!token) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/content/${blog.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ selected_image_ids: Array.from(selected) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel heading="Images" step={4}>
      {images.length === 0 ? (
        <p className="text-[12.5px] text-foreground/55">
          {blog.status === 'images' ? 'Generating 10 images… this can take a minute.' : 'No images yet. Approve the body above to start generating.'}
        </p>
      ) : (
        <>
          <p className="text-[12px] text-foreground/55 mb-3">
            Select <strong>exactly 7</strong> images. Currently selected: <strong>{selected.size}/7</strong>.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {images.map((img) => {
              const isSel = selected.has(img.id);
              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => toggle(img.id)}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all ${isSel ? 'border-primary ring-2 ring-primary/30' : 'border-black/10 hover:border-foreground/40'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt ?? ''} className="block w-full aspect-square object-cover" />
                  <span className="absolute top-1.5 left-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full bg-white/85 text-[9px] font-semibold text-foreground/70 border border-black/10">
                    {img.provider}
                  </span>
                  {isSel && (
                    <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-[12px] font-bold">✓</span>
                  )}
                </button>
              );
            })}
          </div>
          {err && <p className="mt-3 text-[12px] text-rose-700">{err}</p>}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={saveSelection}
              disabled={busy || selected.size !== 7}
              className="px-3 py-1.5 rounded-md bg-foreground text-white text-[11.5px] font-semibold disabled:opacity-50"
              title={selected.size === 7 ? 'Save selection' : 'Select 7 to enable'}
            >
              {busy ? 'Saving…' : 'Save selection'}
            </button>
            <span className="text-[11px] text-foreground/45">{selected.size === 7 ? 'Ready to build.' : `${7 - selected.size} more to pick.`}</span>
          </div>
        </>
      )}
    </Panel>
  );
}

function BuildPanel({ blog, images, token, onChange }: { blog: DbBlog; images: DbImage[]; token: string | null; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ready = (blog.selected_image_ids?.length ?? 0) === 7;

  async function build() {
    if (!token) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/content/${blog.id}/build`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  // Silence unused-arg lint; kept in scope because future iterations may
  // surface per-image hints in the build panel (e.g. provider counts).
  void images;

  return (
    <Panel heading="Build the blog" step={5}>
      <p className="text-[12.5px] text-foreground/65 mb-3 leading-relaxed">
        Asks Claude to compose a layout JSON — alternating prose, the 7 chosen images, SVG icons, a WebGL animation, pull quotes and a closing callout. The public page renders from this layout.
      </p>
      {err && <p className="mb-2 text-[12px] text-rose-700">{err}</p>}
      <button
        type="button"
        onClick={build}
        disabled={busy || !ready}
        className="px-3 py-1.5 rounded-md bg-foreground text-white text-[11.5px] font-semibold disabled:opacity-50"
      >
        {busy ? 'Building…' : blog.layout ? 'Rebuild layout' : 'Build'}
      </button>
      {!ready && <span className="ml-2 text-[11px] text-foreground/55">Save your 7 image selection first.</span>}
    </Panel>
  );
}

function PreviewPanel({ layout }: { layout: Layout }) {
  return (
    <Panel heading="Preview" step={6}>
      <div className="rounded-lg border border-black/5 overflow-hidden bg-white">
        <DbBlogRenderer layout={layout} />
      </div>
    </Panel>
  );
}

function PublishPanel({ blog, token, onChange }: { blog: DbBlog; token: string | null; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go(method: 'POST' | 'DELETE') {
    if (!token) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/content/${blog.id}/publish`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const published = blog.status === 'published';
  return (
    <Panel heading="Publish" step={7}>
      <p className="text-[12.5px] text-foreground/65 mb-3 leading-relaxed">
        {published
          ? 'This post is live on the public site. Unpublish to take it back to a built draft.'
          : 'Flip the post live. It will appear at /who-we-are/blog/<slug> immediately.'}
      </p>
      {err && <p className="mb-2 text-[12px] text-rose-700">{err}</p>}
      {!published ? (
        <button
          type="button"
          onClick={() => go('POST')}
          disabled={busy}
          className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-[11.5px] font-semibold disabled:opacity-50"
        >
          {busy ? 'Publishing…' : 'Publish'}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => go('DELETE')}
          disabled={busy}
          className="px-3 py-1.5 rounded-md border border-black/10 text-[11.5px] font-semibold text-foreground/70 hover:bg-warm-bg/60 disabled:opacity-50"
        >
          {busy ? 'Unpublishing…' : 'Unpublish'}
        </button>
      )}
    </Panel>
  );
}
