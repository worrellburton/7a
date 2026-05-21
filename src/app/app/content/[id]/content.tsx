'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthProvider';
import EditableBlogPreview from '@/components/EditableBlogPreview';
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

interface LibraryImage {
  id: string;
  public_url: string;
  filename: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  seo_title?: string | null;
  seo_description?: string | null;
}

function isAiImage(provider: string): boolean {
  return provider !== 'library';
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
  // Lifted from ReviewPanel so the Step 4 ImagesPanel can render the
  // 10 placeholder swirls the instant the user clicks
  // 'Approve & generate 10 images', not after the route returns.
  // The route sets blogs.status='images' server-side before the
  // parallel generation kicks off, but the client doesn't observe
  // that until the response lands (the request blocks for 90s–4min).
  // Treating `approving` as an optimistic equivalent of status='images'
  // closes that visual gap.
  const [approving, setApproving] = useState(false);

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

  // While image generation is running server-side the only signal the
  // page has that new thumbnails landed is a poll — refetch every 3s
  // for the duration of the 'images' phase so the placeholder swirls
  // give way to real artwork as it arrives.
  useEffect(() => {
    if (blog?.status !== 'images') return;
    // Library imports can land in blog_images during generation too —
    // we only stop polling once the 10 AI rows have all arrived.
    const aiCount = images.filter((i) => isAiImage(i.provider)).length;
    if (aiCount >= 10) return;
    const id = window.setInterval(() => { void load(); }, 3000);
    return () => window.clearInterval(id);
  }, [blog?.status, images, load]);

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

      <PromptPanel
        blogId={blog.id}
        prompt={blog.prompt ?? ''}
        token={token}
        onChange={() => void load()}
      />

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
          onStartApprove={() => setApproving(true)}
          onFinishApprove={() => setApproving(false)}
        />
      )}

      {reachedReview && (
        <ImagesPanel
          blog={blog}
          images={images}
          token={token}
          onChange={() => void load()}
          approving={approving}
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
        <PreviewPanel
          blogId={blog.id}
          layout={blog.layout}
          images={images}
          token={token}
          onSaved={() => void load()}
        />
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

/**
 * Auto-learning progress bar driver. Tracks how long each kind of
 * operation typically takes (per-localStorage key) so the next run
 * shows a progress bar that animates toward 90% on the same curve we
 * actually observed. Once the request resolves we slam to 100% and
 * fold the new duration into a rolling EMA. First-time runs use the
 * `defaultMs` hint until we have real data.
 */
function useAutoProgress(operationKey: string, defaultMs: number) {
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const storageKey = `content-timing:${operationKey}`;

  function getLearnedMs(): number {
    if (typeof window === 'undefined') return defaultMs;
    try {
      const stored = window.localStorage.getItem(storageKey);
      const n = stored ? Number(stored) : NaN;
      return Number.isFinite(n) && n > 0 ? n : defaultMs;
    } catch {
      return defaultMs;
    }
  }

  function saveLearnedMs(elapsed: number) {
    if (typeof window === 'undefined') return;
    try {
      const prev = getLearnedMs();
      // EMA(0.3) — recent runs nudge the estimate without yanking it.
      const next = Math.round(prev * 0.7 + elapsed * 0.3);
      window.localStorage.setItem(storageKey, String(next));
    } catch {
      /* localStorage blocked — keep defaultMs */
    }
  }

  function start() {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    setRunning(true);
    setProgress(0);
    startTimeRef.current = performance.now();
    const target = getLearnedMs();
    const tick = () => {
      if (startTimeRef.current == null) return;
      const elapsed = performance.now() - startTimeRef.current;
      // Asymptote to 0.9 so we never claim "done" before the response
      // lands. Exponential approach reads as "slows down as it gets
      // close" — the right feel for an unknown-duration model call.
      const pct = Math.min(0.9, 1 - Math.exp(-(elapsed / target) * 2.3));
      setProgress(pct);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function finish() {
    const startedAt = startTimeRef.current;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (startedAt != null) {
      saveLearnedMs(performance.now() - startedAt);
    }
    startTimeRef.current = null;
    setProgress(1);
    window.setTimeout(() => {
      setRunning(false);
      setProgress(0);
    }, 450);
  }

  function abort() {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startTimeRef.current = null;
    setRunning(false);
    setProgress(0);
  }

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  return { running, progress, start, finish, abort };
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-2 h-1.5 w-full rounded-full bg-foreground/8 overflow-hidden">
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
  );
}

/**
 * Inline error banner with a one-click Copy button. Image generation
 * in particular can fail in ten different ways at once (per-image fal
 * errors, missing FAL_KEY, storage upload errors) — surfacing the
 * full payload + letting the user copy the lot is the difference
 * between "something broke" and "FAL_KEY is not configured, paste
 * this into chat." Falls back to a manual selectable textarea when
 * the browser blocks the async clipboard API.
 */
function ErrorWithCopy({ message, details }: { message: string; details?: unknown }) {
  const [copied, setCopied] = useState(false);
  const payload = (() => {
    const parts: string[] = [message];
    if (details !== undefined && details !== null) {
      try {
        parts.push(JSON.stringify(details, null, 2));
      } catch {
        parts.push(String(details));
      }
    }
    return parts.join('\n\n');
  })();
  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
      } else {
        const ta = document.createElement('textarea');
        ta.value = payload;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — user can still triple-click + copy by hand */
    }
  }
  return (
    <div className="mb-2 rounded-md border border-rose-200 bg-rose-50/70 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] text-rose-700 leading-snug break-words flex-1">{message}</p>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded border border-rose-300 bg-white text-[10.5px] font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
          aria-label="Copy error details to clipboard"
        >
          {copied ? (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      {details !== undefined && details !== null && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[10.5px] font-semibold uppercase tracking-wider text-rose-700/70 hover:text-rose-700">Details</summary>
          <pre className="mt-1.5 max-h-48 overflow-auto rounded bg-white/70 p-2 text-[10.5px] leading-snug text-rose-900 whitespace-pre-wrap break-words">
            {typeof details === 'string' ? details : JSON.stringify(details, null, 2)}
          </pre>
        </details>
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

function PromptPanel({ blogId, prompt, token, onChange }: { blogId: string; prompt: string; token: string | null; onChange: () => void }) {
  // Step 1 is editable now — clicking '+ New blog' on the list page
  // drops the user here with a placeholder, and they refine the
  // prompt before clicking Generate body. Auto-saves on blur via
  // PATCH /api/content/[id]; refreshes the parent so GeneratePanel
  // reads the freshest prompt on its next click.
  const [draft, setDraft] = useState(prompt);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Keep the textarea in sync when the parent refetches a newer
  // prompt (e.g. another tab edited it). Only does so when the user
  // isn't mid-edit — comparing against the last saved value, not
  // the in-progress draft.
  const lastSavedRef = useRef(prompt);
  useEffect(() => {
    if (lastSavedRef.current !== prompt) {
      lastSavedRef.current = prompt;
      setDraft(prompt);
    }
  }, [prompt]);

  async function save() {
    const trimmed = draft.trim();
    if (trimmed === lastSavedRef.current.trim()) return;
    if (!token) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/content/${blogId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
      lastSavedRef.current = trimmed;
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel heading="Prompt" step={1}>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void save()}
        rows={4}
        placeholder="Describe what this post should be about — topic, angle, anything the model should hold onto."
        className="w-full rounded-lg border border-black/10 px-3 py-2 text-[13.5px] leading-relaxed bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
      />
      <div className="mt-1 flex items-center gap-2 text-[11px] text-foreground/45">
        {saving ? <span>Saving…</span> : <span>Auto-saves when you click away.</span>}
        {err && <span className="text-rose-700">· {err}</span>}
      </div>
    </Panel>
  );
}

function GeneratePanel({ blog, token, onComplete }: { blog: DbBlog; token: string | null; onComplete: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ message: string; details?: unknown } | null>(null);
  const progress = useAutoProgress('generate', 60_000);
  async function go() {
    if (!token) return;
    setBusy(true); setErr(null);
    progress.start();
    try {
      const res = await fetch(`/api/content/${blog.id}/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr({ message: json.error ?? `HTTP ${res.status}`, details: json });
        progress.abort();
        return;
      }
      progress.finish();
      onComplete();
    } catch (e) {
      progress.abort();
      setErr({ message: e instanceof Error ? e.message : String(e) });
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
      {err && <ErrorWithCopy message={err.message} details={err.details} />}
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="px-3 py-1.5 rounded-md bg-foreground text-white text-[11.5px] font-semibold disabled:opacity-50"
      >
        {busy
          ? `Generating… ${Math.round(progress.progress * 100)}%`
          : blog.body_markdown ? 'Regenerate body' : 'Generate blog'}
      </button>
      {progress.running && <ProgressBar value={progress.progress} />}
    </Panel>
  );
}

function ReviewPanel({ blog, token, revisions, onChange, onStartApprove, onFinishApprove }: { blog: DbBlog; token: string | null; revisions: DbRevision[]; onChange: () => void; onStartApprove: () => void; onFinishApprove: () => void }) {
  const [instruction, setInstruction] = useState('');
  // Separate flags per action so a long-running revise doesn't disable
  // the Approve button (or vice-versa). Errors are also scoped so a
  // failed revise doesn't visually attach to the Approve flow.
  const [revising, setRevising] = useState(false);
  const [approving, setApproving] = useState(false);
  const [err, setErr] = useState<{ message: string; details?: unknown } | null>(null);
  const reviseProgress = useAutoProgress('revise', 35_000);

  async function revise() {
    if (!token || !instruction.trim()) return;
    setRevising(true); setErr(null);
    reviseProgress.start();
    try {
      const res = await fetch(`/api/content/${blog.id}/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ instruction: instruction.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr({ message: json.error ?? `HTTP ${res.status}`, details: json });
        reviseProgress.abort();
        return;
      }
      reviseProgress.finish();
      setInstruction('');
      onChange();
    } catch (e) {
      reviseProgress.abort();
      setErr({ message: e instanceof Error ? e.message : String(e) });
    } finally {
      setRevising(false);
    }
  }

  async function approve() {
    if (!token) return;
    setApproving(true); setErr(null);
    // Tell the parent so Step 4 ImagesPanel flips into 'generating'
    // and shows the 10 placeholder swirls immediately — the route
    // blocks for 90s–4min and we don't want the user to think
    // nothing happened.
    onStartApprove();
    try {
      // Approve = kick off image generation. The route returns per-image
      // failure detail in `failures` so we carry the full payload into
      // the error component for the Copy button.
      const res = await fetch(`/api/content/${blog.id}/images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr({ message: json.error ?? `HTTP ${res.status}`, details: json });
        return;
      }
      onChange();
    } catch (e) {
      setErr({ message: e instanceof Error ? e.message : String(e) });
    } finally {
      setApproving(false);
      onFinishApprove();
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
          {err && <ErrorWithCopy message={err.message} details={err.details} />}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={revise}
              disabled={revising || approving || !instruction.trim()}
              className="px-3 py-1.5 rounded-md bg-foreground text-white text-[11.5px] font-semibold disabled:opacity-50"
            >
              {revising
                ? `Revising… ${Math.round(reviseProgress.progress * 100)}%`
                : 'Revise'}
            </button>
            {reviseProgress.running && <ProgressBar value={reviseProgress.progress} />}
            <button
              type="button"
              onClick={approve}
              disabled={revising || approving}
              className="px-3 py-1.5 rounded-md bg-primary text-white text-[11.5px] font-semibold disabled:opacity-50"
              // Progress feedback lives in Step 4 (the Images card)
              // now — the 10 placeholder swirls render there the
              // instant the button is clicked, which reads as
              // 'images are being made over there' instead of 'a
              // grey progress bar is here'.
            >
              {approving ? 'Sent to image gen ↓' : 'Approve & generate 10 images'}
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

function ImagesPanel({ blog, images, token, onChange, approving }: { blog: DbBlog; images: DbImage[]; token: string | null; onChange: () => void; approving: boolean }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(blog.selected_image_ids ?? []));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ message: string; details?: unknown } | null>(null);
  const [tab, setTab] = useState<'generated' | 'library'>('generated');

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
      if (!res.ok) {
        setErr({ message: json.error ?? `HTTP ${res.status}`, details: json });
        return;
      }
      onChange();
    } catch (e) {
      setErr({ message: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  // When server-side generation is in flight the page fills the grid
  // with 10 placeholder cards immediately so the user sees a tangible
  // "10 images on the way" instead of a blank panel. Each slot the
  // server hasn't returned yet renders an animated conic-gradient
  // swirl; arrived images take their slot in order as they land.
  // `approving` is the optimistic counterpart to status='images' —
  // see the lifted state in BlogEditor. Either signal flips this
  // panel into 'generating' mode so 10 placeholder swirls render
  // straight away.
  const generating = blog.status === 'images' || approving;
  // The blog_images table now mixes two sources: AI-generated (provider
  // != 'library') and pulled-in library entries. Each source tab only
  // shows its own rows; selections from either tab roll up into the same
  // 7-image set.
  const aiImages = images.filter((i) => isAiImage(i.provider));
  const libraryImages = images.filter((i) => !isAiImage(i.provider));
  const slotCount = generating ? 10 : aiImages.length;
  const showGrid = generating || aiImages.length > 0;
  const selectedAi = aiImages.filter((i) => selected.has(i.id)).length;
  const selectedLib = libraryImages.filter((i) => selected.has(i.id)).length;

  return (
    <Panel heading="Images" step={4}>
      <div className="mb-3 flex items-center gap-1 border-b border-black/10 -mx-1 px-1">
        <TabButton active={tab === 'generated'} onClick={() => setTab('generated')}>
          <span>Generated by AI</span>
          <span className="ml-1 text-[10px] text-foreground/45">{selectedAi > 0 ? `${selectedAi} selected` : `${aiImages.length}`}</span>
        </TabButton>
        <TabButton active={tab === 'library'} onClick={() => setTab('library')}>
          <span>From your library</span>
          <span className="ml-1 text-[10px] text-foreground/45">{selectedLib > 0 ? `${selectedLib} selected` : libraryImages.length > 0 ? `${libraryImages.length} added` : ''}</span>
        </TabButton>
      </div>

      {!generating && (
        <p className="text-[12px] text-foreground/55 mb-3">
          Pick <strong>4 to 7</strong> images across both tabs. Currently selected: <strong>{selected.size}/7</strong>.
        </p>
      )}

      {tab === 'generated' ? (
        !showGrid ? (
          <p className="text-[12.5px] text-foreground/55">
            No images yet. Approve the body above to start generating.
          </p>
        ) : (
          <>
            {generating && aiImages.length < 10 && (
              <p className="text-[12px] text-foreground/55 mb-3">
                Generating 10 images… <strong>{aiImages.length}/10</strong> ready · this can take a minute.
              </p>
            )}
            <style jsx>{`
              @keyframes content-swirl {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              @keyframes content-shimmer {
                0%, 100% { opacity: 0.55; }
                50% { opacity: 0.85; }
              }
            `}</style>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Array.from({ length: slotCount }).map((_, slotIdx) => {
                const img = aiImages[slotIdx];
                if (!img) {
                  return (
                    <div
                      key={`placeholder-${slotIdx}`}
                      className="relative rounded-lg overflow-hidden border-2 border-black/10 bg-gradient-to-br from-warm-bg/60 via-white to-warm-bg/40 aspect-square"
                      aria-label={`Generating image ${slotIdx + 1} of 10`}
                    >
                      <span
                        className="pointer-events-none absolute inset-0"
                        aria-hidden="true"
                        style={{
                          background: 'conic-gradient(from 0deg, transparent 0deg, rgba(188,107,74,0.35) 90deg, transparent 180deg, rgba(188,107,74,0.18) 270deg, transparent 360deg)',
                          animation: 'content-swirl 1.6s linear infinite',
                        }}
                      />
                      <span className="absolute inset-2 rounded-md bg-white/55" aria-hidden="true" />
                      <span
                        className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/45"
                        style={{ animation: 'content-shimmer 1.8s ease-in-out infinite' }}
                      >
                        {slotIdx + 1} / 10
                      </span>
                    </div>
                  );
                }
                return (
                  <ImageCard
                    key={img.id}
                    img={img}
                    selected={selected.has(img.id)}
                    onToggle={() => toggle(img.id)}
                  />
                );
              })}
            </div>
          </>
        )
      ) : (
        <LibraryTab
          blogId={blog.id}
          token={token}
          libraryImages={libraryImages}
          selected={selected}
          onToggle={toggle}
          onChange={onChange}
        />
      )}

      {err && <div className="mt-3"><ErrorWithCopy message={err.message} details={err.details} /></div>}
      <SelectedStrip
        images={images}
        selected={selected}
        onToggle={toggle}
      />
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={saveSelection}
          disabled={busy || selected.size < 4}
          className="px-3 py-1.5 rounded-md bg-foreground text-white text-[11.5px] font-semibold disabled:opacity-50"
          title={selected.size >= 4 ? 'Save selection' : 'Pick at least 4 to enable'}
        >
          {busy ? 'Saving…' : 'Save selection'}
        </button>
        <span className="text-[11px] text-foreground/45">
          {selected.size >= 4
            ? selected.size === 7
              ? 'Ready to build.'
              : `Ready to build with ${selected.size}. ${7 - selected.size} more if you want a full set.`
            : `${4 - selected.size} more to pick (minimum 4).`}
        </span>
      </div>
    </Panel>
  );
}

// Footer strip — shows the 7 selected images as small thumbnails so the
// editor can see the running selection without flipping tabs. Empty
// slots render as dashed placeholders so the "out of 7" target is
// visible at a glance. Clicking a thumbnail deselects it.
function SelectedStrip({
  images, selected, onToggle,
}: { images: DbImage[]; selected: Set<string>; onToggle: (id: string) => void }) {
  const byId = new Map(images.map((i) => [i.id, i] as const));
  // Stable order: whatever order the user selected in. Set iteration
  // order is insertion order so this Just Works.
  const chosen: DbImage[] = [];
  for (const id of selected) {
    const img = byId.get(id);
    if (img) chosen.push(img);
  }
  const slots = 7;

  return (
    <div className="mt-4 pt-3 border-t border-black/8">
      <p className="text-[10px] uppercase tracking-[0.18em] text-foreground/45 font-bold mb-2">
        Your selection · {chosen.length} / {slots}
      </p>
      <div className="flex flex-wrap items-start gap-2">
        {Array.from({ length: slots }).map((_, idx) => {
          const img = chosen[idx];
          if (!img) {
            return (
              <div
                key={`empty-${idx}`}
                className="w-14 h-14 rounded-md border border-dashed border-black/20 bg-warm-bg/20 flex items-center justify-center text-[10px] font-semibold text-foreground/35"
                aria-hidden="true"
              >
                {idx + 1}
              </div>
            );
          }
          const ai = isAiImage(img.provider);
          return (
            <button
              key={img.id}
              type="button"
              onClick={() => onToggle(img.id)}
              className="group relative w-14 h-14 rounded-md overflow-hidden border-2 border-primary ring-1 ring-primary/40 hover:ring-2 transition-all"
              title={`${ai ? 'AI · ' : 'Library · '}${img.alt ?? ''} — click to remove`}
              aria-label="Remove from selection"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt ?? ''} className="block w-full h-full object-cover" />
              <span
                className={`absolute bottom-0 left-0 right-0 px-0.5 py-px text-[7.5px] font-bold uppercase tracking-wider text-center ${ai ? 'bg-primary/85 text-white' : 'bg-emerald-600/85 text-white'}`}
              >
                {ai ? 'AI' : 'Lib'}
              </span>
              <span className="absolute top-0.5 right-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/0 group-hover:bg-white text-foreground/0 group-hover:text-rose-600 text-[11px] leading-none transition-colors">×</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-[11.5px] font-semibold rounded-t-md transition-colors border-b-2 ${active ? 'border-primary text-foreground bg-warm-bg/30' : 'border-transparent text-foreground/55 hover:text-foreground'}`}
    >
      {children}
    </button>
  );
}

// One thumbnail tile. Shared by both the AI-generated tab and the
// library tab so the AI / library badge + selection chrome stay
// consistent across both sources.
function ImageCard({ img, selected, onToggle }: { img: DbImage; selected: boolean; onToggle: () => void }) {
  const ai = isAiImage(img.provider);
  // Outer wrapper deliberately does NOT use overflow-hidden so the
  // prompt popover can break out of the card bounds (the previous
  // version clipped the popover to the rounded corners). The image
  // itself sits inside an inner overflow-hidden wrapper so the rounded
  // corners still mask the photo.
  return (
    <div
      className={`group/img relative rounded-lg border-2 transition-all ${selected ? 'border-primary ring-2 ring-primary/30' : 'border-black/10 hover:border-foreground/40'}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="block w-full overflow-hidden rounded-[6px]"
        aria-label={selected ? 'Deselect image' : 'Select image'}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.url} alt={img.alt ?? ''} className="block w-full aspect-square object-cover" />
      </button>
      <div className="absolute top-1.5 left-1.5 flex items-center gap-1 pointer-events-none">
        {ai && (
          <span
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary text-white text-[9px] font-bold uppercase tracking-wider border border-primary/40 shadow-sm"
            title="AI-generated image"
          >
            AI
          </span>
        )}
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-white/85 text-[9px] font-semibold text-foreground/70 border border-black/10">
          {ai ? img.provider : 'Library'}
        </span>
      </div>
      <ImagePromptInfo img={img} />
      {selected && (
        <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-[12px] font-bold pointer-events-none z-10">✓</span>
      )}
    </div>
  );
}

// Library tab — search/grid of /app/images uploads + tiles for the
// library entries the editor has already pulled into this blog. Clicking
// an unimported library image POSTs to /api/content/[id]/library-image,
// which inserts a blog_images row with provider='library' so the rest of
// the pipeline (selection · build · render) treats it uniformly.
function LibraryTab({
  blogId, token, libraryImages, selected, onToggle, onChange,
}: {
  blogId: string;
  token: string | null;
  libraryImages: DbImage[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onChange: () => void;
}) {
  const [library, setLibrary] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState<string | null>(null); // site_image_id currently importing
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data, error } = await supabase
          .from('site_images')
          .select('id, public_url, filename, alt, width, height, seo_title, seo_description')
          .order('created_at', { ascending: false })
          .limit(200);
        if (cancelled) return;
        if (error) {
          setErr(error.message);
          setLibrary([]);
        } else {
          setLibrary((data ?? []) as LibraryImage[]);
          setErr(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  // Match against filename + alt + seo metadata — the same fields the
  // /app/images grid surfaces, so the search story stays consistent.
  const filtered = (() => {
    const q = search.trim().toLowerCase();
    if (!q) return library;
    return library.filter((img) => {
      const hay = [img.filename, img.alt, img.seo_title, img.seo_description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  })();

  // Already-imported URLs so we can hide library entries the editor has
  // already pulled in (they'll already be rendering above this grid).
  const importedUrls = new Set(libraryImages.map((i) => i.url));

  async function importImage(siteImageId: string) {
    if (!token) return;
    setImporting(siteImageId); setErr(null);
    try {
      const res = await fetch(`/api/content/${blogId}/library-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ site_image_id: siteImageId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json.error ?? `HTTP ${res.status}`);
        return;
      }
      // Auto-select the freshly imported library image so it shows
      // up in "Your selection · X / 7" immediately. Without this the
      // editor has to click the imported tile a second time to mark
      // it selected, which reads as the count being broken. Only
      // adds it if there's room AND it isn't already in the set
      // (re-importing the same site_image returns the existing
      // blog_image_id, in which case it might already be selected).
      const newId = json?.blog_image_id as string | undefined;
      if (newId && selected.size < 7 && !selected.has(newId)) {
        const nextIds = [...Array.from(selected), newId];
        await fetch(`/api/content/${blogId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ selected_image_ids: nextIds }),
        }).catch(() => { /* refresh below will resync from DB */ });
      }
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setImporting(null);
    }
  }

  async function removeImage(blogImageId: string) {
    if (!token) return;
    setErr(null);
    try {
      const res = await fetch(`/api/content/${blogId}/library-image`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ blog_image_id: blogImageId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json.error ?? `HTTP ${res.status}`);
        return;
      }
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div>
      {libraryImages.length > 0 && (
        <>
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-foreground/45 mb-2">
            Added to this blog ({libraryImages.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
            {libraryImages.map((img) => (
              <div key={img.id} className="relative">
                <ImageCard img={img} selected={selected.has(img.id)} onToggle={() => onToggle(img.id)} />
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className="absolute -top-1.5 -right-1.5 z-20 inline-flex items-center justify-center w-5 h-5 rounded-full bg-white border border-black/15 text-foreground/60 hover:text-rose-600 hover:border-rose-300 shadow-sm text-[12px] leading-none"
                  title="Remove from this blog"
                  aria-label="Remove from this blog"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[10.5px] font-bold uppercase tracking-wider text-foreground/45">
          Image library
        </p>
        <input
          type="search"
          placeholder="Search by name, alt, or SEO…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56 max-w-full rounded-md border border-black/10 px-2 py-1 text-[11.5px] focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {loading ? (
        <p className="text-[12.5px] text-foreground/55 py-6 text-center">Loading library…</p>
      ) : filtered.length === 0 ? (
        <p className="text-[12.5px] text-foreground/55 py-6 text-center">
          {search.trim() ? 'No matches.' : 'No images uploaded yet — head to /app/images to upload some.'}
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 max-h-96 overflow-y-auto p-1">
          {filtered.map((img) => {
            const already = importedUrls.has(img.public_url);
            const isImporting = importing === img.id;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => !already && !isImporting && importImage(img.id)}
                disabled={already || isImporting}
                className={`group relative rounded-md overflow-hidden border-2 transition-all ${already ? 'border-emerald-300 opacity-70 cursor-default' : 'border-black/10 hover:border-foreground/40'}`}
                title={already ? 'Already added' : `Add ${img.filename}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.public_url} alt={img.alt ?? img.filename} className="block w-full aspect-square object-cover" loading="lazy" />
                {already && (
                  <span className="absolute inset-0 flex items-center justify-center bg-emerald-500/15 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                    Added
                  </span>
                )}
                {isImporting && (
                  <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-foreground text-[10px] font-bold uppercase tracking-wider">
                    Adding…
                  </span>
                )}
                {!already && !isImporting && (
                  <span className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-gradient-to-t from-black/65 to-transparent text-white text-[9.5px] truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {img.filename}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {err && <p className="mt-2 text-[11px] text-rose-700">{err}</p>}
    </div>
  );
}

/**
 * Hover-info chip on each generated thumbnail. Surfaces (a) the
 * provider that rendered the image (gpt-image-2 or nano-banana-2)
 * and (b) the exact augmented prompt that was sent to the model —
 * concept text from Claude + the style register the route appended.
 * Tap-friendly: also opens on touch via aria-expanded toggle so it
 * works on mobile where there is no hover.
 */
function ImagePromptInfo({ img }: { img: DbImage }) {
  const [open, setOpen] = useState(false);
  const ai = isAiImage(img.provider);
  const styleHint = (() => {
    const p = (img.prompt ?? '').toLowerCase();
    if (p.includes('editorial illustration')) return 'illustrative';
    if (p.includes('fine-art editorial')) return 'editorial';
    if (p.includes('documentary photography')) return 'photoreal';
    return null;
  })();
  return (
    <div className="absolute bottom-1.5 right-1.5 z-30">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/85 border border-black/10 text-foreground/70 hover:text-foreground hover:bg-white transition-colors shadow-sm"
        aria-label="Show prompt and provider"
        aria-expanded={open}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      </button>
      {open && (
        // Fixed-position popover so it escapes every parent's bounds:
        // the card itself, the grid, the panel, the scroll container.
        // Right-anchored to the info button via JS-free positioning:
        // sticks to bottom-right of the card and grows up + left.
        // High z so it sits above every sibling card in the grid.
        <div
          className="absolute right-0 bottom-7 w-[28rem] max-w-[92vw] rounded-lg border border-black/10 bg-white shadow-2xl p-3 text-[12px] leading-relaxed text-foreground/80 z-50"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-wider text-foreground/50">Source</span>
            {ai ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-wider">AI</span>
            ) : (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold uppercase tracking-wider">Library</span>
            )}
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-foreground/5 text-[10px] font-semibold text-foreground">{img.provider}</span>
            {styleHint && (
              <>
                <span className="text-[9px] font-bold uppercase tracking-wider text-foreground/50 ml-1">Style</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-primary/10 text-[10px] font-semibold text-primary capitalize">{styleHint}</span>
              </>
            )}
          </div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-foreground/50 mb-1">Prompt</p>
          <p className="whitespace-pre-wrap break-words">{img.prompt ?? '(no prompt saved)'}</p>
        </div>
      )}
    </div>
  );
}

function BuildPanel({ blog, images, token, onChange }: { blog: DbBlog; images: DbImage[]; token: string | null; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ message: string; details?: unknown } | null>(null);
  const ready = (blog.selected_image_ids?.length ?? 0) === 7;
  // Build is a long Claude call (12k token output, sometimes with a
  // retry). 90s is the median we've observed; useAutoProgress nudges
  // that toward the real number per-user via EMA.
  const progress = useAutoProgress('build', 90_000);

  async function build() {
    if (!token) return;
    setBusy(true); setErr(null);
    progress.start();
    try {
      const res = await fetch(`/api/content/${blog.id}/build`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr({ message: json.error ?? `HTTP ${res.status}`, details: json });
        progress.abort();
        return;
      }
      progress.finish();
      onChange();
    } catch (e) {
      progress.abort();
      setErr({ message: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  // Surface a quick AI / Library breakdown so the user knows what mix is
  // going into the build before they kick it off.
  const selectedSet = new Set(blog.selected_image_ids ?? []);
  const chosen = images.filter((i) => selectedSet.has(i.id));
  const chosenAi = chosen.filter((i) => isAiImage(i.provider)).length;
  const chosenLib = chosen.length - chosenAi;

  return (
    <Panel heading="Build the blog" step={5}>
      <p className="text-[12.5px] text-foreground/65 mb-3 leading-relaxed">
        Asks Claude to compose a layout JSON — alternating prose, the 7 chosen images, SVG icons, a WebGL animation, pull quotes and a closing callout. The public page renders from this layout.
      </p>
      {ready && (chosenAi > 0 || chosenLib > 0) && (
        <p className="mb-3 text-[11.5px] text-foreground/55">
          Using <strong>{chosenAi}</strong> AI image{chosenAi === 1 ? '' : 's'} and <strong>{chosenLib}</strong> library image{chosenLib === 1 ? '' : 's'}.
        </p>
      )}
      {err && <ErrorWithCopy message={err.message} details={err.details} />}
      <button
        type="button"
        onClick={build}
        disabled={busy || !ready}
        className="px-3 py-1.5 rounded-md bg-foreground text-white text-[11.5px] font-semibold disabled:opacity-50"
      >
        {busy
          ? `Building… ${Math.round(progress.progress * 100)}%`
          : blog.layout ? 'Rebuild layout' : 'Build'}
      </button>
      {!ready && <span className="ml-2 text-[11px] text-foreground/55">Save your 7 image selection first.</span>}
      {progress.running && <ProgressBar value={progress.progress} />}
    </Panel>
  );
}

function PreviewPanel({
  blogId,
  layout,
  images,
  token,
  onSaved,
}: {
  blogId: string;
  layout: Layout;
  images: DbImage[];
  token: string | null;
  onSaved: () => void;
}) {
  return (
    <Panel heading="Preview" step={6}>
      <EditableBlogPreview
        blogId={blogId}
        layout={layout}
        blogImages={images.map((i) => ({
          id: i.id,
          url: i.url,
          alt: i.alt,
          prompt: i.prompt,
          provider: i.provider,
        }))}
        token={token}
        onSaved={onSaved}
      />
    </Panel>
  );
}

function PublishPanel({ blog, token, onChange }: { blog: DbBlog; token: string | null; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ message: string; details?: unknown } | null>(null);

  async function go(method: 'POST' | 'DELETE') {
    if (!token) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/content/${blog.id}/publish`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr({ message: json.error ?? `HTTP ${res.status}`, details: json });
        return;
      }
      onChange();
    } catch (e) {
      setErr({ message: e instanceof Error ? e.message : String(e) });
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
      {err && <ErrorWithCopy message={err.message} details={err.details} />}
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
